const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const { query } = require('express');
const port = process.env.PORT || 5000;
require('dotenv').config();
const stripe = require("stripe")(process.env.STRIPE_SECRET);

const app = express();

// Middleware 
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.qwlqnnv.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


function verifyJWT(req, res, next) {
    // console.log('authorization in', req.headers.authorization);
    const authHeader = req.headers.authorization;
    // console.log(authHeader);
    if (!authHeader) {
        return res.status(401).send('unauthorized access');
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            return res.status.send({ message: 'forbidden access' });
        }
        req.decoded = decoded;
        next();
    })
}

const run = async () => { 
    try {
        const usersCollection = client.db("resaleMobileStore").collection("users");
        const categoriesCollection = client.db("resaleMobileStore").collection("categories");
        const productsCollection = client.db("resaleMobileStore").collection("products");
        const bookingsCollection = client.db("resaleMobileStore").collection("bookings");
        const paymentsCollection = client.db("resaleMobileStore").collection("payments");
        const reportsCollection = client.db("resaleMobileStore").collection("reports");

        // jwt
        app.get('/jwt', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '10d' });
                return res.send({ accessToken: token });
            }

            // console.log(user);
            res.status(403).send({ accessToken: '' })
        })

        // users 
        const verifyAdmin = async (req, res, next) => {
            // console.log('inside verify admin', req.decoded.email);
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail };
            const user = await usersCollection.findOne(query);

            if (user.userType !== 'admin') {
                return res.status(403).send({ message: 'forbidden access' })
            }
            next();
        }
        const verifySeller = async (req, res, next) => {
            // console.log('inside verify seller', req.decoded.email);
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail };
            const user = await usersCollection.findOne(query);
            if (user.userType !== 'seller') {
                return res.status(403).send({ message: 'forbidden access' })
            }
            next();
        }
        const verifyBuyer = async (req, res, next) => {
            // console.log('inside verify seller', req.decoded.email);
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail };
            const user = await usersCollection.findOne(query);
            if (user.userType !== 'buyer') {
                return res.status(403).send({ message: 'forbidden access' })
            }
            next();
        }

        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            res.send({ isAdmin: user?.userType === 'admin' });
        });

        app.get('/users/sellerVerify/:sellerEmail', async (req, res) => {
            const email = req.params.sellerEmail;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            res.send(user);
        });

        app.get('/users/seller/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            res.send({ isSeller: user?.userType === 'seller' });
        });

        app.get('/users/buyer/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            res.send({ isBuyer: user?.userType === 'buyer' });
        });

        // users Buyer 
        app.get('/users/buyers', async (req, res) => {
            const query = {userType: 'buyer'};
            const result = await usersCollection.find(query).toArray();
            res.send(result);
        });

        app.put('/users/buyers/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    userType: 'admin'
                }
            }
            const result = await usersCollection.updateOne(filter, updatedDoc, options);
            res.send(result);
        });

        app.delete('/users/buyers/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await usersCollection.deleteOne(filter);
            res.send(result);
        })
        // users seller
        app.get('/users/sellers', async (req, res) => {
            const query = {userType: 'seller'};
            const result = await usersCollection.find(query).toArray();
            res.send(result);
        });
        app.put('/users/sellers/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    userType: 'admin'
                }
            }
            const result = await usersCollection.updateOne(filter, updatedDoc, options);
            res.send(result);
        });
        app.put('/users/sellerVerify/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    verifySeller: 'verified'
                }
            }
            const result = await usersCollection.updateOne(filter, updatedDoc, options);
            res.send(result);
        });

        app.delete('/users/sellers/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await usersCollection.deleteOne(filter);
            res.send(result);
        })
        //users admins
        app.get('/users/admins', async (req, res) => {
            const query = { userType: 'admin' };
            const result = await usersCollection.find(query).toArray();
            res.send(result);
        });
        app.delete('/users/admins/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await usersCollection.deleteOne(filter);
            res.send(result);
        })
        // users 
        app.post('/users', async (req, res) => {
            const user = req.body;
            const query = {
                email: user.email
            }
            const alreadyAddedUser = await usersCollection.find(query).toArray();
            if (alreadyAddedUser.length) {
                const message = `already you are our user. Don't need to create an account`;
                return res.send({ message })
            }
            const result = await usersCollection.insertOne(user);
            res.send(result);
        })

        // Category 

        app.get('/category/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const category = await categoriesCollection.find(query).project({ categoryName: 1 }).toArray();
            res.send(category);
        });

        app.get('/categories3', async (req, res) => {
            const query = {};
            const result = await categoriesCollection.find(query).limit(3).toArray();
            res.send(result);
        });
        app.get('/categories', async (req, res) => {
            const query = {};
            const result = await categoriesCollection.find(query).toArray();
            res.send(result);
        });

        app.post('/categories', verifyJWT, verifySeller, async (req, res) => {
            const category = req.body;
            const query = {
                categoryName: category.categoryName
            }
            const alreadyAddedCategory = await categoriesCollection.find(query).toArray();
            if (alreadyAddedCategory.length) {
                const message = `${category.categoryName} category already Added`;
                return res.send({ acknowledged: false, message })
            }
            const result = await categoriesCollection.insertOne(category);
            res.send(result);
        });

        // Products showed 
        app.get('/advProducts', async (req, res) => {
            const query = {
                advStatus: "advertised"
            };
            const products = await productsCollection.find(query).toArray();
            if (products) {
                res.send(products);
            }
        });

        app.get('/productsPic', async (req, res) => {
            const query = {};
            const products = await productsCollection.find(query).toArray();
            res.send(products);
        });

        app.get('/products/:id', async (req, res) => {
            const id = req.params.id;
            const query = { categoryId: id };
            const products = await productsCollection.find(query).toArray();
            res.send(products);
        });

        app.get('/products', verifyJWT, verifySeller, async (req, res) => {
            const sellerEmail = req.query.sellerEmail;
            const query = { sellerEmail: sellerEmail };
            const products = await productsCollection.find(query).toArray();
            res.send(products);
        });

        app.post('/products', verifyJWT, verifySeller, async (req, res) => {
            const product = req.body;
            const result = await productsCollection.insertOne(product);
            res.send(result);
        });

        app.put('/products/seller/:id', verifyJWT, verifySeller, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    advStatus: 'advertised'
                }
            }
            const result = await productsCollection.updateOne(filter, updatedDoc, options);
            res.send(result);
        });

        app.delete('/products/:id', verifyJWT, verifySeller, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await productsCollection.deleteOne(filter);
            res.send(result);
        });

        // report 
        app.get('/reports', verifyJWT, verifyAdmin, async (req, res) => {
            const query = {};
            const result = await reportsCollection.find(query).toArray();
            res.send(result);
        });

        app.delete('/reports/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await reportsCollection.deleteOne(query);
            res.send(result);
        });

        app.post('/reports', verifyJWT, async (req, res) => {
            const reports = req.body;
            const decodedEmail = req.decoded.email;

            const query = { email: decodedEmail };
            const user = await usersCollection.findOne(query);

            if (user.userType !== 'buyer') {
                return res.send({ message: 'You are not a buyer. Only buyer can report any products' })
            }

            const result = await reportsCollection.insertOne(reports);
            res.send(result);
        });

        // bookings 
        app.get('/bookings', verifyJWT, verifyBuyer, async (req, res) => {
            const email = req.query.email;
            const query = { buyerEmail: email };
            const bookings = await bookingsCollection.find(query).sort('_id', -1).toArray();
            res.send(bookings);
        });

        app.get('/bookings/seller/:sellerEmail', async (req, res) => {
            const email = req.params.sellerEmail;
            console.log('email', email);
            const query = { sellerEmail: email };
            const bookings = await bookingsCollection.find(query).sort('_id', -1).toArray();
            res.send(bookings);
        });

        app.post('/bookings', verifyJWT, async (req, res) => {
            const booking = req.body;
            const decodedEmail = req.decoded.email;
            
            const query = { email: decodedEmail };
            const user = await usersCollection.findOne(query);
            
            if (user.userType !== 'buyer') {
                return res.send({ message: 'You are not a buyer. Only buyer can buy any products' })
            }

            const filter = { _id: ObjectId(booking.productId) };
            const updatedDoc = {
                $set: {
                    booking: 'booked',
                    advStatus: 'not advertised'
                }
            }
            const productUpdate = await productsCollection.updateOne(filter, updatedDoc);
            // console.log(booking);

            const result = await bookingsCollection.insertOne(booking);
            res.send(result);
        });

        app.put('/bookings/:id', verifyJWT, verifyBuyer, async (req, res) => {
            const productId = req.params.id;
            const filter = { _id: ObjectId(productId) };
            // console.log(filter);
            const option = { upsert: true };
            const updatedDoc = {
                $set: {
                    booking: 'booking deleted',
                }
            }
            const paymentQuery = { productId: productId };
            const paymentDetails = await paymentsCollection.findOne(paymentQuery);
            
            const productUpdate = await productsCollection.updateOne(filter, updatedDoc, option);
            res.send({ productUpdate, paymentDetails });
        })

        app.delete('/bookingsPaymentDelete/:id', verifyJWT, verifyBuyer, async (req, res) => {
            const paymentId = req.params.id;
            const query = { _id: ObjectId(paymentId) };
            const result = await paymentsCollection.deleteOne(query);
            res.send(result);
        });
        
        app.delete('/bookings/:id', verifyJWT, verifyBuyer, async (req, res) => {
            const bookingId = req.params.id;
            const query = { _id: ObjectId(bookingId) };
            
            const order = await bookingsCollection.findOne(query);
            const result = await bookingsCollection.deleteOne(query);
            res.send({ order, result });
        });

        app.get('/bookings/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const booking = await bookingsCollection.findOne(query);
            res.send(booking);
        })

        //card online payments
        app.post('/create-payment-intent', async (req, res) => {
            const booking = req.body;
            const price = booking.productPrice;
            const amount = price * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                currency: 'usd',
                amount: amount,
                "payment_method_types": [
                    "card"
                ],
            });
            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        })

        app.post('/payments', async (req, res) => {
            const payment = req.body;
            const result = await paymentsCollection.insertOne(payment);
            const id = payment.bookingId;
            const filter = { _id: ObjectId(id) };
            const updatedDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId
                }
            }
            const updateResult = await bookingsCollection.updateOne(filter, updatedDoc);

            const pId = payment.productId;
            const query = { _id: ObjectId(pId), };
            const updatedDocs = {
                $set: {
                    booking: 'paid',
                    advStatus: 'not advertised',
                    transactionId: payment.transactionId,
                    soldStatus: 'sold'
                }
            }
            const updateProducts = await productsCollection.updateOne(query, updatedDocs);

            res.send(result);
        })

        app.get('/paymentVerify/:id', async (req, res) => {
            const id = req.params.id;
            const query = { productId: id };
            const payments = await paymentsCollection.findOne(query);
            // console.log(payments);
            res.send(payments);
        })

       
    }
    finally {
        
    }
}
run().catch(console.dir)
app.get('/', async (req, res) => {
    res.send('Resale Mobile Store server is running');
})

app.listen(port, () => {
    console.log(`Resale Mobile Store is running on port ${port}`)
})