import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCollectionExists = vi.fn();
const mockCreateCollection = vi.fn();

vi.mock("@qdrant/js-client-rest", () => ({
  QdrantClient: class {
    collectionExists = mockCollectionExists;
    createCollection = mockCreateCollection;
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
