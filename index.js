/** @format */

const express = require("express");
const app = express();
const cors = require("cors");
var jwt = require("jsonwebtoken");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// verify token
const verifyJWT = (req, res, next) => {
	const authorization = req.headers.authorization;

	if (!authorization) {
		return res
			.status(401)
			.send({ error: true, message: "Unauthorized Access" });
	}
	const token = authorization.split(" ")[1];

	jwt.verify(token, process.env.USER_VERIFY_TOKEN, (error, decoded) => {
		if (error) {
			return res
				.status(401)
				.send({ error: true, message: "Unauthorized Access" });
		}
		req.decoded = decoded;
		next();
	});
};

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.nvffntx.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
	serverApi: {
		version: ServerApiVersion.v1,
		strict: true,
		deprecationErrors: true,
	},
});

async function run() {
	try {
		// Connect the client to the server	(optional starting in v4.7)
		await client.connect();

		const userCollection = client.db("supportSystem").collection("users");
		const ticketCollection = client
			.db("supportSystem")
			.collection("ticket");

		// jwt token
		app.post("/jwt-token", async (req, res) => {
			const body = req.body;
			const token = jwt.sign(body, process.env.USER_VERIFY_TOKEN, {
				expiresIn: "1h",
			});

			res.send({ token });
		});

		app.get('/total-ticket', async (req, res) => {
			const email = req.query.email;
			
			const query = {email}
			const totalTicket = await ticketCollection.countDocuments(query)
			console.log(totalTicket);
			res.send({totalTicket});
			
		})

		// create new user when sing up or sing in
		app.post("/create_user", async (req, res) => {
			const userInfo = req.body;
			const query = { email: userInfo.email };
			const isExist = await userCollection.findOne(query);
			console.log(isExist);
			if (isExist) {
				return res.send({});
			}
			const storedUser = await userCollection.insertOne(userInfo);

			console.log(storedUser);
			res.send(storedUser);
		});

		// create ticket
		app.post(`/create-ticket`, verifyJWT, async (req, res) => {
			const ticket = req.body;

			console.log(ticket, ' cit')
			// to make ticket nlumber
			let totalTicket = await ticketCollection.estimatedDocumentCount();
			if (totalTicket < 9) {
				totalTicket = `000${totalTicket + 1}`;
			} else if (totalTicket < 99) {
				totalTicket = `00${totalTicket + 1}`;
			} else if (totalTicket < 999) {
				totalTicket = `0${totalTicket + 1}`;
			}

			const ticketDate = new Date();
			let day = ticketDate.getDate();
			if (day < 10) {
				day = `0${day}`;
			}
			let month = ticketDate.getMonth() + 1;
			if (month < 10) {
				console.log("first");
				month = `0${month}`;
			}
			const year = ticketDate.getFullYear() % 100;

			const ticketInfo = {
				...ticket,
				ticketID: `NTPIDS${day}${month}${year}${totalTicket}`,
				status: "Open",
			};

			const result = await ticketCollection.insertOne(ticketInfo);

			res.send(result);
		});

		// get all tickes by user 
		app.get("/get-user-ticket", verifyJWT, async (req, res) => {
			const email = req.query.email;
			
			if (email !== req.decoded.email) {
				return res
					.status(403)
					.send({ error: true, message: "Forbidden Access" });
			}
			const isAdmin = await userCollection.findOne({ email });
			if (isAdmin.role === "admin") {
				const tikets = await ticketCollection.find().toArray();
				return res.send(tikets);
			}
			const query = { email };
			const tikets = await ticketCollection.find(query).toArray();
			res.send(tikets);
		});

		// get single ticket
		app.get("/get-single-ticket/:id", verifyJWT, async (req, res) => {
			const id = req.params.id;
			const query = { _id: new ObjectId(id) };
			const singleTicket = await ticketCollection.findOne(query);
			res.send(singleTicket);
		});

		// get ticket status 
		app.get("/ticket-status", verifyJWT, async (req, res) => {
			const email = req.query.email;
			if (email !== req.decoded.email) {
				return res
					.status(403)
					.send({ error: true, message: "Forbidden Access" });
			}

			const isAdmin = await userCollection.findOne({ email });

			if (isAdmin.role === "admin") {
				const openStatusResult = await ticketCollection
					.aggregate([
						{ $match: {  status: "Open" } },
						{ $group: { _id: "$status", count: { $sum: 1 } } },
					])
					.toArray();

				const openHighStatusRestult = await ticketCollection
					.aggregate([
						{ $match: { priority: "high", status: "Open" } },
						{ $group: { _id: "$status", count: { $sum: 1 } } },
					])
					.toArray();
				const answeredStatusResult = await ticketCollection
					.aggregate([
						{ $match: { status: "Answered" } },
						{ $group: { _id: "$status", count: { $sum: 1 } } },
					])
					.toArray();

				const answeredHighStatusRestult = await ticketCollection
					.aggregate([
						{
							$match: {
								priority: "high",
								status: "Answered",
							},
						},
						{ $group: { _id: "$status", count: { $sum: 1 } } },
					])
					.toArray();

				// in progress
				const inprogressStatusResult = await ticketCollection
					.aggregate([
						{ $match: {  status: "In Progress" } },
						{ $group: { _id: "$status", count: { $sum: 1 } } },
					])
					.toArray();

				const inprogressHighStatusRestult = await ticketCollection
					.aggregate([
						{
							$match: {
								
								priority: "high",
								status: "In Progress",
							},
						},
						{ $group: { _id: "$status", count: { $sum: 1 } } },
					])
					.toArray();
				// close
				const closeStatusResult = await ticketCollection
					.aggregate([
						{ $match: { status: "Close" } },
						{ $group: { _id: "$status", count: { $sum: 1 } } },
					])
					.toArray();

				const closeHighStatusRestult = await ticketCollection
					.aggregate([
						{
							$match: {
								
								priority: "high",
								status: "Close",
							},
						},
						{ $group: { _id: "$status", count: { $sum: 1 } } },
					])
					.toArray();

				return res.send({
					openStatusResult,
					openHighStatusRestult,
					answeredStatusResult,
					answeredHighStatusRestult,
					inprogressStatusResult,
					inprogressHighStatusRestult,
					closeStatusResult,
					closeHighStatusRestult,
				});
			}


			const openStatusResult = await ticketCollection
				.aggregate([
					{ $match: { email, status: "Open" } },
					{ $group: { _id: "$status", count: { $sum: 1 } } },
				])
				.toArray();

			const openHighStatusRestult = await ticketCollection
				.aggregate([
					{ $match: { email, priority: "high", status: "Open" } },
					{ $group: { _id: "$status", count: { $sum: 1 } } },
				])
				.toArray();
			const answeredStatusResult = await ticketCollection
				.aggregate([
					{ $match: { email, status: "Answered" } },
					{ $group: { _id: "$status", count: { $sum: 1 } } },
				])
				.toArray();

			const answeredHighStatusRestult = await ticketCollection
				.aggregate([
					{ $match: { email, priority: "high", status: "Answered" } },
					{ $group: { _id: "$status", count: { $sum: 1 } } },
				])
				.toArray();

			// in progress
			const inprogressStatusResult = await ticketCollection
				.aggregate([
					{ $match: { email, status: "In Progress" } },
					{ $group: { _id: "$status", count: { $sum: 1 } } },
				])
				.toArray();

			const inprogressHighStatusRestult = await ticketCollection
				.aggregate([
					{
						$match: {
							email,
							priority: "high",
							status: "In Progress",
						},
					},
					{ $group: { _id: "$status", count: { $sum: 1 } } },
				])
				.toArray();
			// close
			const closeStatusResult = await ticketCollection
				.aggregate([
					{ $match: { email, status: "Close" } },
					{ $group: { _id: "$status", count: { $sum: 1 } } },
				])
				.toArray();

			const closeHighStatusRestult = await ticketCollection
				.aggregate([
					{ $match: { email, priority: "high", status: "Close" } },
					{ $group: { _id: "$status", count: { $sum: 1 } } },
				])
				.toArray();

			res.send({
				openStatusResult,
				openHighStatusRestult,
				answeredStatusResult,
				answeredHighStatusRestult,
				inprogressStatusResult,
				inprogressHighStatusRestult,
				closeStatusResult,
				closeHighStatusRestult,
			});
		});

		// Send a ping to confirm a successful connection
		await client.db("admin").command({ ping: 1 });
		console.log(
			"Pinged your deployment. You successfully connected to MongoDB!"
		);
	} finally {
		// Ensures that the client will close when you finish/error
		// await client.close();
	}
}
run().catch(console.dir);

app.get("/", (req, res) => {
	res.send("Support Portal Server is running....");
});

app.listen(port, () => {
	console.log(`this server is running on ${port}`);
});
