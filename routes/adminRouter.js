const express=require("express")
const adminRoutes=express.Router()
const adminController=require("../controllers/admin/adminController")
const customerController=require("../controllers/admin/customerController")
const categoryController=require("../controllers/admin/categoryController")
const productController=require("../controllers/admin/productController")
const {adminAuth}=require("../middlewares/auth")
adminRoutes.get("/login",adminController.loadAdmin)
adminRoutes.get("/",adminAuth,adminController.loaddashboard)
adminRoutes.post("/login",adminController.adminlogin)
adminRoutes.get("/logout",adminController.logout)
adminRoutes.get("/pagenotfound",adminAuth,adminController.pagenotfound)

//customer management routes
adminRoutes.get("/users",adminAuth,customerController.customerInfo)
adminRoutes.get("/blockcust",adminAuth,customerController.blockuser)
adminRoutes.get("/unblockcust",adminAuth,customerController.unblockuser)

//category management routes
adminRoutes.get("/category",adminAuth,categoryController.categoryinfo)
adminRoutes.post("/addcategory",adminAuth,categoryController.addcategories)
adminRoutes.get("/listed",adminAuth,categoryController.listcat)
adminRoutes.get("/unlisted",adminAuth,categoryController.unlistcat)
adminRoutes.get("/editcategory",adminAuth,categoryController.getEditCategory)
adminRoutes.post("/editcategory/:id",adminAuth,categoryController.editcat)

//product routes
adminRoutes.get("/addProduct",adminAuth,productController.productaddpage)
adminRoutes.post("/addProduct", adminAuth, productController.uploads.array("images", 4), productController.addProduct);
adminRoutes.get("/products",adminAuth,productController.getproduct)
adminRoutes.get("/blockProduct",adminAuth,productController.blockproduct)
adminRoutes.get("/unblockProduct",adminAuth,productController.unblockproduct)

module.exports=adminRoutes