const express=require("express")
const adminRoutes=express.Router()
const adminController=require("../controllers/admin/adminController")
const customerController=require("../controllers/admin/customerController")
const categoryController=require("../controllers/admin/categoryController")
const productController=require("../controllers/admin/productController")
const couponController=require("../controllers/admin/couponController")
const salesController=require("../controllers/admin/salesController")
const {adminAuth}=require("../middlewares/auth")
const dashboardController=require("../controllers/admin/DashboardController")
adminRoutes.get("/login",adminController.loadAdmin)
adminRoutes.get("/",adminAuth,dashboardController.loadDashboard)
adminRoutes.post("/login",adminController.adminlogin)
adminRoutes.get("/logout",adminController.logout)
adminRoutes.get("/pagenotfound",adminAuth,adminController.pagenotfound)

//customer management routes
adminRoutes.get("/users",adminAuth,customerController.customerInfo)
// adminRoutes.get("/blockcust",adminAuth,customerController.blockuser)
// adminRoutes.get("/unblockcust",adminAuth,customerController.unblockuser)
adminRoutes.get("/blockunblockcust",adminAuth,customerController.UserBlockUnblock)

//category management routes
adminRoutes.get("/category",adminAuth,categoryController.categoryInfo)
adminRoutes.post("/addcategory",adminAuth,categoryController.addcategories)
// adminRoutes.get("/listed",adminAuth,categoryController.listcat)
// adminRoutes.get("/unlisted",adminAuth,categoryController.unlistcat)
adminRoutes.get("/listunlist",adminAuth,categoryController.listunlist)

adminRoutes.get("/editcategory",adminAuth,categoryController.getEditCategory)
adminRoutes.post("/editcategory",adminAuth,categoryController.EditCategories)
adminRoutes.post("/addCategoryOffer",adminAuth,categoryController.addCategoryOffer)
adminRoutes.post("/removeCategoryOffer",adminAuth,categoryController.removeCategoryOffer)

//product routes
adminRoutes.get("/addProduct",adminAuth,productController.productaddpage)
adminRoutes.post("/addProduct", adminAuth, productController.uploads.array("images", 4), productController.addProduct);
adminRoutes.get("/products",adminAuth,productController.getproduct)
adminRoutes.get("/blockProduct",adminAuth,productController.blockproduct)
adminRoutes.get("/unblockProduct",adminAuth,productController.unblockproduct)
adminRoutes.get("/EditProduct",adminAuth,productController.getEditProduct)
adminRoutes.post("/editproduct/:id",adminAuth,productController.uploads.array('images',4),productController.editProduct);
adminRoutes.post("/addproductoffer",adminAuth,productController.addProductOffer)
adminRoutes.post("/removeproductoffer",adminAuth,productController.removeProductOffer)
adminRoutes.post("/deleteimage",adminAuth,productController.deleteSingleImage)
adminRoutes.get("/order/:id",adminAuth,productController.loadOrderDetails)

//ordermanagement
adminRoutes.get("/orders",adminAuth,productController.orders)
adminRoutes.post("/updateorderstatus",adminAuth,productController.updateorderstatus)
adminRoutes.get("/stock",adminAuth,productController.loadstock)
adminRoutes.put("/updateProductStock/:productId",adminAuth,productController.updatestock)

//coupon management
adminRoutes.get("/coupons",adminAuth,couponController.loadcreatecoupon)
adminRoutes.post("/coupons",adminAuth,couponController.createcoupon)
adminRoutes.get("/managecoupon",adminAuth,couponController.loadmanagecoupon)
adminRoutes.delete('/coupons/:id',adminAuth,couponController.deleteCoupon);

//sales management
adminRoutes.get("/salesreport",adminAuth,salesController.loadSalesReport)
adminRoutes.get("/download-pdf",adminAuth,salesController.DownloadPdf)
adminRoutes.get("/download-excel",adminAuth,salesController.downloadExcel)
// adminRoutes.get("/dashboardAdmin",adminAuth,dashboardController.loadDashboard)
module.exports=adminRoutes