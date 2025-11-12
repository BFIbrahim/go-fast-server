const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');


dotenv.config()

const stripe = require('stripe')(process.env.PAYMENT_STRIPE_KEY)

const app = express()
const port = process.env.PORT || 5000

app.use(cors())
app.use(express.json())



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.0crvfc6.mongodb.net/?appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        // Send a ping to confirm a successful connection

        const db = client.db('parcelDB')
        const parcelCollection = db.collection('parcels')
        const paymentCollection = db.collection('payments')

        app.get('/parcels', async (req, res) => {
            const parcels = await parcelCollection.find().toArray()
            res.send(parcels)
        })

        app.get('/parcels', async (req, res) => {
            try {
                const email = req.query.email;

                const query = email ? { userEmail: email } : {}
                const options = {
                    sort: {
                        createdAt: -1
                    }
                }

                const parcels = await parcelCollection.find(query, options).toArray()
                res.send(parcels)
            } catch (error) {
                console.log(error)
                express.response.status.send({ message: 'failed to get parcels' })
            }
        })

        app.post('/parcels', async (req, res) => {
            try {
                const newParcel = req.body
                // newParcel.createdAt = new Date();

                const result = await parcelCollection.insertOne(newParcel)
                res.status(201).send(result)
            } catch (error) {
                console.error('The Error id', error)
                res.status(500).send({ message: 'failed to create new parcel' })
            }
        })

        app.get('/parcels/:id', async (req, res) => {
            try {
                const id = req.params.id
                const parcel = await parcelCollection.findOne({ _id: new ObjectId(id) })

                res.send(parcel)
            } catch (error) {
                console.log(error)
            }
        })

        app.delete('/parcels/:id', async (req, res) => {
            try {
                const id = req.params.id

                const result = await parcelCollection.deleteOne({ _id: new ObjectId(id) })

                res.send(result)
            } catch (error) {
                console.log(error)
                res.send({ message: 'failed to Delete the parcel' })
            }
        })

        app.get('/payments', async(req, res) => {
            try {
                const userEmail = req.query.email
                
                const query = userEmail ? {email: userEmail} : {}
                const options = {sort: {paidAt: -1}}

                const payments = await paymentCollection.find(query, options).toArray()
                res.send(payments)

            } catch (error) {
                console.log(error)
                res.send({message: 'getting payments failed'})
            }
        })

        app.post('/payments', async (req, res) => {
            try {
                const { parcelId, email, amount, paymentMethod, transectionId } = req.body

                const updateResult = await parcelCollection.updateOne(
                    { _id: new ObjectId(parcelId) },
                    {
                        $set: {
                            paymentStatus: 'paid'
                        }
                    }

                )

                if (updateResult.modifiedCount === 0) {
                    return res.send({message: 'parcel not found ot already paid'})
                }

                const paymentDoc = {
                    parcelId,
                    email,
                    amount,
                    paymentMethod,
                    transectionId,
                    paidAtString: new Date().toISOString(),
                    paidAt: new Date()
                }

                const paymentResult = await paymentCollection.insertOne(paymentDoc)

                res.send({
                    message: 'payment recorded and parcel',
                    insertedId: paymentResult.insertedId
                })


            } catch (error) {

            }
        })

        app.post('/create-payment-intent', async (req, res) => {

            const amountInCents = req.body.amountInCents

            try {
                const paymentIntent = await stripe.paymentIntents.create({
                    amount: amountInCents,
                    currency: 'usd',
                    payment_method_types: ['card']
                })
                res.json({ clientSecret: paymentIntent.client_secret })
            } catch (error) {
                res.json({ error: error.message })
            }
        })

        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send(`Server is Running on port`)
})

app.listen(port, () => {
    console.log(`server is Running on port ${port}`)
})