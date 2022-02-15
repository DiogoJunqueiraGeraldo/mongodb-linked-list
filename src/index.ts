import { Collection, Document, InsertOneResult, ObjectId } from "mongodb";

enum Position {
  AFTER,
  BEFORE,
}

interface IRelation {
  position: Position;
  id: ObjectId;
}

interface ILinkable {
  _id: ObjectId;
  head?: boolean;
  next?: ObjectId;
}

class LinkedCollection<T> {
  private coll: Collection<Document>;

  constructor(collection: Collection<Document>) {
    this.coll = collection;
  }

  convert(data: any): T & ILinkable {
    return data as unknown as T & ILinkable;
  }

  /**
   *
   * @param data document to be inserted
   * @param relation position to be inserted
   *
   * If relation is not given, the document will be insert in the last position
   */
  async insert(data: T, relation?: IRelation): Promise<ObjectId> {
    let linkableData = this.convert(data);
    let inserted: InsertOneResult<Document>;

    if (!relation) {
      const lastDoc = this.convert(await this.coll.findOne({ next: null }));

      if (!lastDoc) {
        linkableData.head = true;
      }

      inserted = await this.coll.insertOne(linkableData);

      if (lastDoc) {
        await this.coll.updateOne(
          { _id: lastDoc._id },
          { $set: { next: inserted.insertedId } }
        );
      }
    } else {
      const relatedDoc = this.convert(
        await this.coll.findOne({ _id: relation.id })
      );

      switch (relation.position) {
        case Position.AFTER: {
          linkableData.next = relatedDoc.next;

          inserted = await this.coll.insertOne(linkableData);

          await this.coll.updateOne(
            { _id: relatedDoc._id },
            {
              $set: {
                next: inserted.insertedId,
              },
            }
          );

          break;
        }

        case Position.BEFORE: {
          if (relatedDoc.head) {
            linkableData.head = relatedDoc.head;
          }

          linkableData.next = relatedDoc._id;

          inserted = await this.coll.insertOne(linkableData);

          if (!linkableData.head) {
            await this.coll.updateOne(
              {
                next: relatedDoc._id,
              },
              {
                $set: {
                  next: inserted.insertedId,
                },
              }
            );
          } else {
            await this.coll.updateOne(
              {
                _id: relatedDoc._id,
              },
              { $set: { head: undefined } }
            );
          }

          break;
        }
      }
    }

    return inserted.insertedId;
  }
}

export { IRelation, ILinkable, Position, LinkedCollection };
