const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const User = require("../../models/userSchema");
const fs = require("fs");
const multer = require("multer");
const path = require("path");
const sharp = require("sharp");

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, "../../public/uploads/re-image"));
    },
    filename:(req,file,cb)=>{
        cb(null,Date.now() +"-"+ file.originalname);
    }
});

const uploads = multer({ storage: storage }); 

const productaddpage = async (req, res) => {
    try {
        const category = await Category.find({ isListed: true });
        res.render("product-load", { cat: category, error: null,success:null});
    } catch (error) {
        console.log("Error:", error);
        res.redirect("/pagenotfound");
    }
};

const addProduct = async (req,res) => {
    try {
        const products = req.body;
        const categories = await Category.find({ isListed: true });
        const productExists = await Product.findOne({
            productName:products.productName
        })


        if(!productExists){
            const images = [];
            
            if(req.files && req.files.length > 0) {
                for (let i = 0; i < req.files.length; i++) {
                    const originalImagePath = req.files[i].path;
                    const resizedImagePath = path.join("public", "uploads", "product-images", req.files[i].filename);
                    await sharp(originalImagePath).resize({ width: 440, height: 440 }).toFile(resizedImagePath);
                    images.push(req.files[i].filename);
                }
            }
            

            const categoryId = await Category.findOne({name:products.category})

            if(!categoryId){
                return res.render("product-load",{cat:categories,error:"Invalid category name",success:null})
            }

            const newProduct = new Product({
                productName:products.productName,
                description:products.description,
                category:categoryId._id,
                regularPrice:products.regularPrice,
                salePrice:products.salePrice,
                createdAt:new Date(),
                quantity:products.quantity,
                size:products.size,
                color:products.color,
                productImage:images,
                status:"Available",
            })

            await newProduct.save();
            return res.render("product-load",{cat:categories,error:null,success:"product saved sucessfully"})

        }else{
            
            return res.render("product-load",{cat:categories,error:"product already exist",success:null})
        }

    } catch (error) {
        console.error("Error adding product",error)
        res.redirect('/pagenotfound')
    }
}
const getproduct = async (req, res) => {
    try {
        const productData=await Product.find().populate("category")
        const category = await Category.find({ isListed: true });

        if (category) {
            res.render("products", {
                data: productData,   
                cat: category,       
            });
        } else {
            res.redirect("/pagenotfound")
        }

    } catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).send("Internal Server Error");
    }
}

const blockproduct=async(req,res)=>{
    try {
        let id=req.query.id
        await Product.updateOne({_id:id},{$set:{isBlocked:true}})
        res.redirect("/admin/products")
    } catch (error) {
        res.redirect("/pagenotfound")
        console.log("error",error)
    }
}
const unblockproduct=async(req,res)=>{
    try {
        let id=req.query.id
        await Product.updateOne({_id:id},{$set:{isBlocked:false}})
        res.redirect("/admin/products")
    } catch (error) {
        res.redirect("/pagenotfound")
        console.log("error",error)
    }
}

module.exports = {
    productaddpage,
    addProduct,
    uploads,
    getproduct,
    blockproduct,
    unblockproduct
};
