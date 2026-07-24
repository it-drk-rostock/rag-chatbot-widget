import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCollectionExists = vi.fn();
const mockCreateCollection = vi.fn();
const mockDeleteCollection = vi.fn();

vi.mock("@qdrant/js-client-rest", () => ({
  QdrantClient: class {
    collectionExists = mockCollectionExists;
    createCollection = mockCreateCollection;
    deleteCollection = mockDeleteCollection;
  },
}));

describe("ensureCollectionExists", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates collection when missing", async () => {
    mockCollectionExists.mockResolvedValue(false);
    const { ensureCollectionExists } = await import("./qdrantClient");

    await ensureCollectionExists("test-collection");

    expect(mockCollectionExists).toHaveBeenCalledWith("test-collection");
    expect(mockCreateCollection).toHaveBeenCalledWith("test-collection", {
      vectors: { size: 1536, distance: "Cosine" },
    });
  });

  it("skips creation when collection exists", async () => {
    mockCollectionExists.mockResolvedValue(true);
    const { ensureCollectionExists } = await import("./qdrantClient");

    await ensureCollectionExists("existing-collection");

    expect(mockCollectionExists).toHaveBeenCalledWith("existing-collection");
    expect(mockCreateCollection).not.toHaveBeenCalled();
  });
});

describe("resetCollection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes existing collection and creates a new one", async () => {
    mockCollectionExists.mockResolvedValue(true);
    mockDeleteCollection.mockResolvedValue(true);
    const { resetCollection } = await import("./qdrantClient");

    await resetCollection("reset-collection");

    expect(mockCollectionExists).toHaveBeenCalledWith("reset-collection");
    expect(mockDeleteCollection).toHaveBeenCalledWith("reset-collection");
    expect(mockCreateCollection).toHaveBeenCalledWith("reset-collection", {
      vectors: { size: 1536, distance: "Cosine" },
    });
  });

  it("creates collection directly if it does not exist yet", async () => {
    mockCollectionExists.mockResolvedValue(false);
    const { resetCollection } = await import("./qdrantClient");

    await resetCollection("new-collection");

    expect(mockCollectionExists).toHaveBeenCalledWith("new-collection");
    expect(mockDeleteCollection).not.toHaveBeenCalled();
    expect(mockCreateCollection).toHaveBeenCalledWith("new-collection", {
      vectors: { size: 1536, distance: "Cosine" },
    });
  });
});

