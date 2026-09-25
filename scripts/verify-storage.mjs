import "dotenv/config";
import mongoose from "mongoose";

const uri = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/multi_forge";

try {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  const database = mongoose.connection.db;
  if (!database) throw new Error("MongoDB database handle is unavailable");
  const [rawItems, normalizedItems, searchHistory, searchJobs, repositoryResults, searchCache] = await Promise.all([
    database.collection("rawitems").countDocuments({ source: "github" }),
    database.collection("normalizeditems").countDocuments({ source: "github" }),
    database.collection("searchhistories").countDocuments({ status: "completed" }),
    database.collection("search_jobs").countDocuments(),
    database.collection("repository_results").countDocuments(),
    database.collection("search_cache").countDocuments()
  ]);
  console.log(JSON.stringify({ rawItems, normalizedItems, completedSearches: searchHistory, searchJobs, repositoryResults, searchCache }));
} finally {
  await mongoose.disconnect();
}
