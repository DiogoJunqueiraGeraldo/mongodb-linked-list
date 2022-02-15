import { Collection, Db, Document, MongoClient } from "mongodb";
import { LinkedCollection, Position } from "../src/index";

interface Music {
  name: string;
  artist: string;
}

const testPlaylist: Array<Music> = [
  {
    name: "The Devil Wears a Suit and Tie",
    artist: "Colter Wall",
  },
  {
    name: "Pickup Man",
    artist: "Joe Diffie",
  },
  {
    name: "Flowers On the Wall",
    artist: "The Statler Brothers",
  },
  {
    name: "Take Me Home, Country Roads",
    artist: "John Denver",
  },
  {
    name: "Sixteen Tons",
    artist: "Tennesseee Ernie Ford",
  },
  {
    name: "Hey, Good Lookin'",
    artist: "Hank Williams",
  },
  {
    name: "Union Dixie",
    artist: "Tennesseee Ernie Ford",
  },
];

describe("insertion", () => {
  let linkedCollection: LinkedCollection<Music>;
  let conn = new MongoClient("mongodb+srv://<use>:<psw>@<domain>/test");
  let database: Db;
  let collection: Collection<Document>;

  beforeAll(async () => {
    await conn.connect();

    database = conn.db("i-love-country-music");
    collection = await database.createCollection("playlist");
    linkedCollection = new LinkedCollection(collection);
  });

  afterAll(async () => {
    await database.dropCollection("playlist");
    await conn.close();
  });

  afterEach(async () => {
    if (collection) await collection.deleteMany({});
  });

  test("insert first document", async () => {
    /**
     * Given: One music
     * When: The music is inserted on playlist
     * Then: The music becomes the head and tail
     */

    const [testMusic] = [...testPlaylist];
    const insertedId = await linkedCollection.insert(testMusic);
    const inserted = await collection.findOne({ _id: insertedId });

    if (inserted) {
      const music = linkedCollection.convert(inserted);

      expect(music.head).toBe(true);
      expect(music.next).toBeFalsy();
      expect(music.name).toBe(testMusic.name);
      expect(music.artist).toBe(testMusic.artist);
    } else {
      fail("could not find inserted document");
    }
  });

  test("insert after first document", async () => {
    /**
     * Given: Two musics
     * When: The second music is inserted after the first
     * Then: The first music should has next referencec to the second
     */

    const [firstMusic, testMusic] = [...testPlaylist];
    const firstInsertedId = await linkedCollection.insert(firstMusic);
    const insertedId = await linkedCollection.insert(testMusic, {
      id: firstInsertedId,
      position: Position.AFTER,
    });

    const firstInserted = await collection.findOne({ _id: firstInsertedId });
    const inserted = await collection.findOne({ _id: insertedId });

    if (firstInserted && inserted) {
      const headMusic = linkedCollection.convert(firstInserted);
      const music = linkedCollection.convert(inserted);

      expect(headMusic.head).toBe(true);
      expect(headMusic.artist).toBe(firstMusic.artist);
      expect(headMusic.name).toBe(firstMusic.name);
      expect(headMusic.next).toStrictEqual(music._id);

      expect(music.head).toBeFalsy();
      expect(music.artist).toBe(testMusic.artist);
      expect(music.name).toBe(testMusic.name);
      expect(music.next).toBeFalsy();
    } else {
      fail("could not find inserted documents");
    }
  });

  test("insert before first document", async () => {
    /**
     * Given: Two musics
     * When: The second music is inserted before the first
     * Then: The second music should has next reference to the first and be the new head
     */

    const [firstMusic, testMusic] = [...testPlaylist];
    const firstInsertedId = await linkedCollection.insert(firstMusic);
    const insertedId = await linkedCollection.insert(testMusic, {
      id: firstInsertedId,
      position: Position.BEFORE,
    });

    const firstInserted = await collection.findOne({ _id: firstInsertedId });
    const inserted = await collection.findOne({ _id: insertedId });

    if (firstInserted && inserted) {
      const headMusic = linkedCollection.convert(inserted);
      const music = linkedCollection.convert(firstInserted);

      expect(headMusic.head).toBe(true);
      expect(headMusic.artist).toBe(testMusic.artist);
      expect(headMusic.name).toBe(testMusic.name);
      expect(headMusic.next).toStrictEqual(music._id);

      expect(music.head).toBeFalsy();
      expect(music.artist).toBe(firstMusic.artist);
      expect(music.name).toBe(firstMusic.name);
      expect(music.next).toBeFalsy();
    } else {
      fail("could not find inserted documents");
    }
  });

  test("insert after last document", async () => {
    /**
     * Given: Two musics
     * When: The second music is inserted before the first
     * Then: The second music should has next reference to the first and be the new head
     */

    const [firstMusic, testMusic] = [...testPlaylist];
    const firstInsertedId = await linkedCollection.insert(firstMusic);
    const insertedId = await linkedCollection.insert(testMusic);

    const firstInserted = await collection.findOne({ _id: firstInsertedId });
    const inserted = await collection.findOne({ _id: insertedId });

    if (firstInserted && inserted) {
      const headMusic = linkedCollection.convert(firstInserted);
      const music = linkedCollection.convert(inserted);

      expect(headMusic.head).toBe(true);
      expect(headMusic.artist).toBe(firstMusic.artist);
      expect(headMusic.name).toBe(firstMusic.name);
      expect(headMusic.next).toStrictEqual(music._id);

      expect(music.head).toBeFalsy();
      expect(music.artist).toBe(testMusic.artist);
      expect(music.name).toBe(testMusic.name);
      expect(music.next).toBeFalsy();
    } else {
      fail("could not find inserted documents");
    }
  });
});
