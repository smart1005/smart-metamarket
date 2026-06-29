const { db } = require("../config/firebase");

const createCollection = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Collection name is required" });
    }

    const collectionRef = await db.collection("vendorCollections").add({
      name,
      description: description || "",
      vendorId: req.user.id,
      vendorName: req.user.name,
      createdAt: new Date(),
    });

    res.status(201).json({
      message: "Collection created successfully",
      id: collectionRef.id,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error creating collection",
      error: error.message,
    });
  }
};

const getVendorCollections = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const snapshot = await db
      .collection("vendorCollections")
      .where("vendorId", "==", vendorId)
      .get();

    const collections = await Promise.all(
      snapshot.docs.map(async (doc) => {
        // get products inside this collection
        const productsSnapshot = await db
          .collection("collectionItems")
          .where("collectionId", "==", doc.id)
          .get();

        const products = productsSnapshot.docs.map((p) => ({
          id: p.id,
          ...p.data(),
        }));

        return {
          id: doc.id,
          ...doc.data(),
          products,
        };
      }),
    );

    res.status(200).json({ collections });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching collections",
      error: error.message,
    });
  }
};

const addProductToCollection = async (req, res) => {
  try {
    const { collectionId } = req.params;
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({ message: "Product ID is required" });
    }

    // verify collection belongs to this vendor
    const collectionDoc = await db
      .collection("vendorCollections")
      .doc(collectionId)
      .get();

    if (!collectionDoc.exists) {
      return res.status(404).json({ message: "Collection not found" });
    }

    if (collectionDoc.data().vendorId !== req.user.id) {
      return res
        .status(403)
        .json({ message: "You can only add to your own collections" });
    }

    // verify product belongs to this vendor
    const productDoc = await db.collection("products").doc(productId).get();
    if (!productDoc.exists) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (productDoc.data().vendorId !== req.user.id) {
      return res
        .status(403)
        .json({ message: "You can only add your own products to collections" });
    }

    // check if product already in collection
    const existing = await db
      .collection("collectionItems")
      .where("collectionId", "==", collectionId)
      .where("productId", "==", productId)
      .get();

    if (!existing.empty) {
      return res
        .status(400)
        .json({ message: "Product already in this collection" });
    }

    await db.collection("collectionItems").add({
      collectionId,
      productId,
      productName: productDoc.data().name,
      productPrice: productDoc.data().price,
      vendorId: req.user.id,
      addedAt: new Date(),
    });

    res
      .status(201)
      .json({ message: "Product added to collection successfully" });
  } catch (error) {
    res.status(500).json({
      message: "Error adding product to collection",
      error: error.message,
    });
  }
};

const removeProductFromCollection = async (req, res) => {
  try {
    const { collectionId, productId } = req.params;

    const snapshot = await db
      .collection("collectionItems")
      .where("collectionId", "==", collectionId)
      .where("productId", "==", productId)
      .get();

    if (snapshot.empty) {
      return res
        .status(404)
        .json({ message: "Product not found in collection" });
    }

    await snapshot.docs[0].ref.delete();
    res
      .status(200)
      .json({ message: "Product removed from collection successfully" });
  } catch (error) {
    res.status(500).json({
      message: "Error removing product from collection",
      error: error.message,
    });
  }
};

const deleteCollection = async (req, res) => {
  try {
    const { collectionId } = req.params;

    const collectionDoc = await db
      .collection("vendorCollections")
      .doc(collectionId)
      .get();

    if (!collectionDoc.exists) {
      return res.status(404).json({ message: "Collection not found" });
    }

    if (collectionDoc.data().vendorId !== req.user.id) {
      return res
        .status(403)
        .json({ message: "You can only delete your own collections" });
    }

    // delete all items in collection first
    const itemsSnapshot = await db
      .collection("collectionItems")
      .where("collectionId", "==", collectionId)
      .get();

    const batch = db.batch();
    itemsSnapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    // then delete collection
    await db.collection("vendorCollections").doc(collectionId).delete();

    res.status(200).json({ message: "Collection deleted successfully" });
  } catch (error) {
    res.status(500).json({
      message: "Error deleting collection",
      error: error.message,
    });
  }
};

module.exports = {
  createCollection,
  getVendorCollections,
  addProductToCollection,
  removeProductFromCollection,
  deleteCollection,
};
