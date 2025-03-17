import { Express, Request, Response } from "express";
import { db } from "@db";
import { products, productCategories } from "@db/schema";
import { desc, eq, like, or } from "drizzle-orm";
import { z } from "zod";
import { Service } from "./service-registry";
import { validateBody, validateParams } from "../validation";
import { appEvents, EventTypes } from "../lib/event-emitter";

/**
 * Product ID parameter schema
 */
const productIdSchema = z.object({
  id: z.string().transform(val => parseInt(val, 10))
});

/**
 * Category ID parameter schema
 */
const categoryIdSchema = z.object({
  id: z.string().transform(val => parseInt(val, 10))
});

/**
 * Product creation/update schema
 */
const productSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  sku: z.string().optional(),
  description: z.string().nullable().optional(),
  price: z.number().min(0),
  priceDiscount: z.number().nullable().optional(), // Precio de oferta
  stock: z.number().min(0).default(0),
  active: z.boolean().default(true),
  status: z.string().optional().default('active'), // Estado del producto (active, draft, discontinued)
  brand: z.string().nullable().optional(),
  category_id: z.number().nullable().optional(), // ID de categoría
  wooCommerceId: z.number().nullable().optional(),
  wooCommerceParentId: z.number().nullable().optional(), // ID del producto padre (para variaciones)
  productType: z.string().optional().default('simple'), // Tipo de producto (simple, variable, variation)
  weight: z.number().nullable().optional(), // Peso del producto en kg
  dimensions: z.record(z.any()).optional(), // Dimensiones como objeto JSON
  images: z.array(z.string()).optional(), // URLs de imágenes
  attributes: z.record(z.any()).nullable().optional(), // Atributos
  relatedProducts: z.array(z.number()).optional(), // IDs de productos relacionados
});

/**
 * Stock update schema
 */
const stockUpdateSchema = z.object({
  stock: z.number().min(0),
  reason: z.string().optional()
});

/**
 * Category creation/update schema
 */
const categorySchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().nullable().optional(),
  active: z.boolean().default(true)
});

/**
 * Service responsible for managing inventory (products and categories)
 */
export class InventoryService implements Service {
  name = "inventory";

  registerRoutes(app: Express): void {
    // Product routes
    app.get("/api/products", this.getAllProducts.bind(this));
    app.get("/api/products/:id", validateParams(productIdSchema), this.getProductById.bind(this));
    app.post("/api/products", validateBody(productSchema), this.createProduct.bind(this));
    app.patch("/api/products/:id", validateParams(productIdSchema), validateBody(productSchema), this.updateProduct.bind(this));
    app.delete("/api/products/:id", validateParams(productIdSchema), this.deleteProduct.bind(this));
    app.patch("/api/products/:id/stock", validateParams(productIdSchema), validateBody(stockUpdateSchema), this.updateProductStock.bind(this));
    
    // Category routes
    app.get("/api/product-categories", this.getAllCategories.bind(this));
    app.get("/api/product-categories/:id", validateParams(categoryIdSchema), this.getCategoryById.bind(this));
    app.post("/api/product-categories", validateBody(categorySchema), this.createCategory.bind(this));
    app.patch("/api/product-categories/:id", validateParams(categoryIdSchema), validateBody(categorySchema), this.updateCategory.bind(this));
    app.delete("/api/product-categories/:id", validateParams(categoryIdSchema), this.deleteCategory.bind(this));
  }

  /**
   * Get all products
   */
  async getAllProducts(req: Request, res: Response): Promise<void> {
    try {
      const { search, brand, category, active } = req.query;
      
      // Build the query with potential filters
      let query = db.select().from(products);
      
      // Apply filters if provided
      if (search) {
        const searchTerm = `%${search}%`;
        query = query.where(
          or(
            like(products.name, searchTerm),
            like(products.sku, searchTerm),
            like(products.description, searchTerm)
          )
        );
      }
      
      if (brand) {
        query = query.where(eq(products.brand, brand as string));
      }
      
      if (category) {
        const categoryIdValue = parseInt(category as string, 10);
        if (!isNaN(categoryIdValue)) {
          query = query.where(eq(products.categoryId, categoryIdValue));
        }
      }
      
      if (active !== undefined) {
        const isActive = active === 'true';
        query = query.where(eq(products.active, isActive));
      }
      
      // Order by creation date (newest first)
      query = query.orderBy(desc(products.createdAt));
      
      const result = await query;
      res.json(result);
    } catch (error) {
      console.error('Error fetching products:', error);
      res.status(500).json({ error: "Failed to fetch products" });
    }
  }

  /**
   * Get product by ID
   */
  async getProductById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const productId = parseInt(id);
      
      const result = await db.query.products.findFirst({
        where: eq(products.id, productId)
      });
      
      if (!result) {
        res.status(404).json({ error: "Product not found" });
        return;
      }
      
      res.json(result);
    } catch (error) {
      console.error('Error fetching product:', error);
      res.status(500).json({ error: "Failed to fetch product" });
    }
  }

  /**
   * Create a new product
   */
  async createProduct(req: Request, res: Response): Promise<void> {
    try {
      const productData = req.body;
      
      // Generate a SKU if not provided
      if (!productData.sku) {
        productData.sku = this.generateSku(productData.name, productData.brand || 'GEN');
      }

      const [product] = await db.insert(products).values({
        name: productData.name,
        sku: productData.sku,
        description: productData.description || null,
        price: productData.price,
        priceDiscount: productData.priceDiscount || null,
        stock: productData.stock || 0,
        active: productData.active ?? true,
        status: productData.status || 'active',
        brand: productData.brand || null,
        categoryId: productData.category_id || null,
        wooCommerceId: productData.wooCommerceId || null,
        wooCommerceParentId: productData.wooCommerceParentId || null,
        productType: productData.productType || 'simple',
        weight: productData.weight || null,
        dimensions: productData.dimensions || {},
        images: productData.images || [],
        attributes: productData.attributes || {},
        relatedProducts: productData.relatedProducts || [],
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      // Emit product created event
      appEvents.emit(EventTypes.PRODUCT_CREATED, product);
      
      res.status(201).json(product);
    } catch (error) {
      console.error('Error creating product:', error);
      res.status(500).json({ error: "Failed to create product" });
    }
  }

  /**
   * Update a product
   */
  async updateProduct(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const productId = parseInt(id);
      const productData = req.body;

      // Check if product exists
      const existingProduct = await db.query.products.findFirst({
        where: eq(products.id, productId)
      });

      if (!existingProduct) {
        res.status(404).json({ error: "Product not found" });
        return;
      }

      const [updatedProduct] = await db.update(products)
        .set({
          name: productData.name,
          sku: productData.sku || existingProduct.sku,
          description: productData.description ?? existingProduct.description,
          price: productData.price,
          priceDiscount: productData.priceDiscount ?? existingProduct.priceDiscount,
          stock: productData.stock ?? existingProduct.stock,
          active: productData.active ?? existingProduct.active,
          status: productData.status ?? existingProduct.status,
          brand: productData.brand ?? existingProduct.brand,
          categoryId: productData.category_id ?? existingProduct.categoryId,
          wooCommerceId: productData.wooCommerceId ?? existingProduct.wooCommerceId,
          wooCommerceParentId: productData.wooCommerceParentId ?? existingProduct.wooCommerceParentId,
          productType: productData.productType ?? existingProduct.productType,
          weight: productData.weight ?? existingProduct.weight,
          dimensions: productData.dimensions ?? existingProduct.dimensions,
          images: productData.images ?? existingProduct.images,
          attributes: productData.attributes ?? existingProduct.attributes,
          relatedProducts: productData.relatedProducts ?? existingProduct.relatedProducts,
          updatedAt: new Date()
        })
        .where(eq(products.id, productId))
        .returning();

      // Emit product updated event
      appEvents.emit(EventTypes.PRODUCT_UPDATED, updatedProduct);
      
      res.json(updatedProduct);
    } catch (error) {
      console.error('Error updating product:', error);
      res.status(500).json({ error: "Failed to update product" });
    }
  }

  /**
   * Delete a product
   */
  async deleteProduct(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const productId = parseInt(id);

      // Check if product exists
      const existingProduct = await db.query.products.findFirst({
        where: eq(products.id, productId)
      });

      if (!existingProduct) {
        res.status(404).json({ error: "Product not found" });
        return;
      }

      // Delete the product
      await db.delete(products).where(eq(products.id, productId));

      // Emit product deleted event
      appEvents.emit(EventTypes.PRODUCT_DELETED, existingProduct);
      
      res.status(200).json({ success: true, message: "Product deleted successfully" });
    } catch (error) {
      console.error('Error deleting product:', error);
      res.status(500).json({ error: "Failed to delete product" });
    }
  }

  /**
   * Update product stock
   */
  async updateProductStock(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const productId = parseInt(id);
      const { stock, reason } = req.body;

      // Check if product exists
      const existingProduct = await db.query.products.findFirst({
        where: eq(products.id, productId)
      });

      if (!existingProduct) {
        res.status(404).json({ error: "Product not found" });
        return;
      }

      const previousStock = existingProduct.stock;
      
      // Update product stock
      const [updatedProduct] = await db.update(products)
        .set({
          stock,
          updatedAt: new Date()
        })
        .where(eq(products.id, productId))
        .returning();

      // Emit product stock changed event
      appEvents.emit(EventTypes.PRODUCT_STOCK_CHANGED, {
        product: updatedProduct,
        previousStock,
        newStock: stock,
        reason
      });
      
      res.json(updatedProduct);
    } catch (error) {
      console.error('Error updating product stock:', error);
      res.status(500).json({ error: "Failed to update product stock" });
    }
  }

  /**
   * Get all product categories
   */
  async getAllCategories(_req: Request, res: Response): Promise<void> {
    try {
      const result = await db.select().from(productCategories).orderBy(desc(productCategories.createdAt));
      res.json(result);
    } catch (error) {
      console.error('Error fetching product categories:', error);
      res.status(500).json({ error: "Failed to fetch product categories" });
    }
  }

  /**
   * Get category by ID
   */
  async getCategoryById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const categoryId = parseInt(id);
      
      const result = await db.query.productCategories.findFirst({
        where: eq(productCategories.id, categoryId),
        with: {
          products: true
        }
      });
      
      if (!result) {
        res.status(404).json({ error: "Category not found" });
        return;
      }
      
      res.json(result);
    } catch (error) {
      console.error('Error fetching category:', error);
      res.status(500).json({ error: "Failed to fetch category" });
    }
  }

  /**
   * Create a new product category
   */
  async createCategory(req: Request, res: Response): Promise<void> {
    try {
      const categoryData = req.body;

      const [category] = await db.insert(productCategories).values({
        name: categoryData.name,
        description: categoryData.description || null,
        active: categoryData.active ?? true,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();
      
      res.status(201).json(category);
    } catch (error) {
      console.error('Error creating category:', error);
      res.status(500).json({ error: "Failed to create category" });
    }
  }

  /**
   * Update a category
   */
  async updateCategory(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const categoryId = parseInt(id);
      const categoryData = req.body;

      // Check if category exists
      const existingCategory = await db.query.productCategories.findFirst({
        where: eq(productCategories.id, categoryId)
      });

      if (!existingCategory) {
        res.status(404).json({ error: "Category not found" });
        return;
      }

      const [updatedCategory] = await db.update(productCategories)
        .set({
          name: categoryData.name,
          description: categoryData.description ?? existingCategory.description,
          active: categoryData.active ?? existingCategory.active,
          updatedAt: new Date()
        })
        .where(eq(productCategories.id, categoryId))
        .returning();
      
      res.json(updatedCategory);
    } catch (error) {
      console.error('Error updating category:', error);
      res.status(500).json({ error: "Failed to update category" });
    }
  }

  /**
   * Delete a category
   */
  async deleteCategory(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const categoryId = parseInt(id);

      // Check if category exists
      const existingCategory = await db.query.productCategories.findFirst({
        where: eq(productCategories.id, categoryId),
        with: {
          products: true
        }
      });

      if (!existingCategory) {
        res.status(404).json({ error: "Category not found" });
        return;
      }

      // Check if category has products - if so, don't allow deletion
      if (existingCategory.products?.length > 0) {
        res.status(400).json({ 
          error: "Cannot delete category with existing products. Update or delete the products first, or make the category inactive." 
        });
        return;
      }

      // Delete the category
      await db.delete(productCategories).where(eq(productCategories.id, categoryId));
      
      res.status(200).json({ success: true, message: "Category deleted successfully" });
    } catch (error) {
      console.error('Error deleting category:', error);
      res.status(500).json({ error: "Failed to delete category" });
    }
  }

  /**
   * Generate a SKU for a product
   */
  private generateSku(productName: string, brand: string): string {
    const brandPrefix = brand.slice(0, 3).toUpperCase();
    const namePrefix = productName
      .replace(/[^a-zA-Z0-9]/g, '') // Remove non-alphanumeric characters
      .slice(0, 3).toUpperCase();
    const randomSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${brandPrefix}-${namePrefix}${randomSuffix}`;
  }
}

// Create and export the service instance
export const inventoryService = new InventoryService();