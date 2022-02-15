# POC

Goal: achieve a reliable and scalable collection register structure that makes the system capable of ordering and pagination operations without losing performance 

## Concept

LinkedList

## Initial Implementation

```js
const { Collection, Document } = require("mongodb");

/**
 *
 * @param {Collection<Document>} coll
 * @param {{}} doc
 */
async function appendToStart(coll, doc) {
  await coll.updateOne(
    {
      head: true,
      _id: {
        $ne: (
          await coll.insertOne({
            ...doc,
            head: true,
          })
        ).insertedId,
      },
    },
    {
      $unset: {
        head: "",
      },
    }
  );
}

/**
 *
 * @param {Collection<Document>} coll
 * @param {{}} doc
 */
async function appendToEnd(coll, doc) {
  const newTail = await coll.insertOne({
    ...doc,
    next: null,
  });

  await coll.updateOne(
    {
      next: null,
      _id: {
        $ne: newTail.insertedId,
      },
    },
    {
      $set: {
        next: newTail.insertedId,
      },
    }
  );
}

/**
 *
 * @param {Collection<Document>} coll
 * @param {{}} query
 * @param {{}} doc
 */
async function insertAfter(coll, query, doc) {
  const target = await coll.findOne(query);

  const newDoc = await coll.insertOne({
    ...doc,
    next: target.next,
  });

  await coll.updateOne(
    {
      next: target.next,
      _id: {
        $ne: newDoc.insertedId,
      },
    },
    {
      $set: {
        next: newDoc.insertedId,
      },
    }
  );
}

/**
 *
 * @param {Collection<Document>} coll
 * @param {{}} query
 * @param {{}} doc
 */
async function insertBefore(coll, query, doc) {
  const target = await coll.findOne(query);

  const newDoc = await coll.insertOne({
    ...doc,
    next: target._id,
  });

  await coll.updateOne(
    {
      next: target._id,
      _id: {
        $ne: newDoc.insertedId,
      },
    },
    {
      $set: { next: newDoc.insertedId },
    }
  );
}

/**
 *
 * @param {Collection<Document>} coll
 * @param {{}} query
 * @param {{}} doc
 * @return {FindCursor<Document>}
 */
async function getPage(coll, limit = 3, page = 0) {
  let docs = [];

  let prev = await coll.findOne({ head: true });
  for (let i = 0; i < limit * page; i++) {
    if (!prev.next) {
      return [];
    }

    prev = await coll.findOne({ _id: prev.next });
  }

  for (let i = 0; i < limit; i++) {
    docs.push(prev);

    if (!prev.next) {
      break;
    }

    prev = await coll.findOne({ _id: prev.next });
  }

  return docs;
}

```