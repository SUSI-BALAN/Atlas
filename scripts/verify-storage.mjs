import mongoose from "mongoose";

const uri = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/internet_collector";

try {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  const database = mongoose.connection.db;
  if (!database) throw new Error("MongoDB database handle is unavailable");
  const [rawItems, normalizedItems, searchHistory] = await Promise.all([
    database.collection("rawitems").countDocuments({ source: "github" }),
    database.collection("normalizeditems").countDocuments({ source: "github" }),
    database.collection("searchhistories").countDocuments({ status: "completed" })
  ]);
  console.log(JSON.stringify({ rawItems, normalizedItems, completedSearches: searchHistory }));
} finally {
  await mongoose.disconnect();
}
