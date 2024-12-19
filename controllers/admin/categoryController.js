const Category=require("../../models/categorySchema")
const Product=require("../../models/productSchema")

const categoryinfo=async(req,res)=>{
    try {
        const cat = await Category.find({})
        res.render("category",{cat})
    } catch (error) {
        console.error("Error Loading Category info",error)
    }
}

const addcategories = async (req, res) => {
    try {
        const { name, description } = req.body;
        const existingCategory = await Category.findOne({ name });
        if (existingCategory) {
            return res.status(400).json({success:false,message:"Category already exist"})
        }

        const createCategory = new Category({
            name,
            description,
        });
        
        await createCategory.save();
        return res.status(200).json({success:true,message:"Category Added successfully"})
    } catch (error) {
        console.error("Error adding category:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};

const listunlist=async(req,res)=>{
    try {
        const id=req.query.id
        console.log(id)
        const condition=await Category.findOne({_id:id})
        const islistedunlist=condition.isListed
        if(islistedunlist)
        {
            await Category.updateOne({_id:id},{$set:{isListed:false}})
            res.redirect("/admin/category")
        }
        else{
            await Category.updateOne({_id:id},{$set:{isListed:true}})
            res.redirect("/admin/category")
        }
    } catch (error) {
        console.log("error",error)
    }
}

const getEditCategory = async (req,res) => {
    try {
        
        const id = req.query.id;
        const category = await Category.findOne({_id:id});
        res.render('edit-category',{category,message:""})

    } catch (error) {
        console.error("Error Loading categories for Edit",error)
        res.redirect('/pagenotfound')
    }
}

const editcat = async (req, res) => {
    const id = req.query.id;

    if (!id) {
        return res.status(400).json({ success: false, message: "Category ID is missing" });
    }

    try {
        const currentCategory = await Category.findById(id); 
        
        if (!currentCategory) {
            return res.status(404).json({ success: false, message: "Category not found" });
        }

        const { name, description } = req.body;
        const updateCategory = await Category.findByIdAndUpdate(id, { name, description }, { new: true });

        return res.status(200).json({ success: true, message: "Category updated successfully" });
    } catch (error) {
        console.log("Error:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};


const addCategoryOffer=async(req,res)=>{
    try {
        const percentage=parseInt(req.body.percentage,10)
        const categoryId=req.body.categoryId
        
        const category=await Category.findById(categoryId)
        if(!category)
        {
            return res.status(400).json({status:false,message:"Category not found"})
        }
        const products= await Product.find({category:category._id})

        for(let i=0;i<products.length;i++)
        {
            if(products[i].productOffer>0){
                return res.json({status:false,message:"products with category already have product offer"})
            }
        }
        await Category.updateOne({_id:categoryId},{$set:{categoryOffer:percentage}})
        for(const product of products){
            const effectiveOffer=Math.max(percentage,product.productOffer)
            product.salePrice=product.regularPrice-Math.floor(product.regularPrice*(effectiveOffer/100))
            await product.save()
        }
        return res.json({status:true,message:"Category offer set successfully"})

    } catch (error) {
        res.status(500).json({status:false,message:"Internal server error"})
    }
}

const removeCategoryOffer=async(req,res)=>{
    try {
        const categoryId=req.body.categoryId
        const category=await Category.findById(categoryId)

        if(!category){
        return  res.status(404).json({status:false,message:"Category is not defined"})
        }
        const percentage=category.categoryOffer
        const products=await Product.find({category:category._id})
        if(products.length>0){
            for(const product of products){
                product.salePrice+=Math.floor(product.regularPrice * (percentage/100))
                product.productOffer=0
                await product.save() 
            }
        }
        category.categoryOffer=0
        await category.save() 
        return res.json({status:true})

    } catch (error) {
        res.status(500).json({status:false,message:"Internal Server Error"})
        console.log("err",error)
    }
}
module.exports={
    addcategories,
    categoryinfo,
    listunlist,
    editcat,
    getEditCategory,
    addCategoryOffer,
    removeCategoryOffer

}