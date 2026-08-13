const fs = require("fs");
const path = require("path");
const dataDir = path.join(process.cwd(), "scripts/celanworksmith/runtime-data");
const runtime = db.getSiblingDB("celanworksmith_runtime");

function seed(collectionName, fileName) {
  const documents = JSON.parse(fs.readFileSync(path.join(dataDir, fileName), "utf8"));
  const collection = runtime.getCollection(collectionName);
  documents.forEach((document) => collection.replaceOne({ _id: document._id }, document, { upsert: true }));
  print(`${collectionName}: ${documents.length} documents upserted`);
}

seed("suppliers", "suppliers.json");
seed("purchase_orders", "purchase_orders.json");
