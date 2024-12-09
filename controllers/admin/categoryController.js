const Category=require("../../models/categorySchema")


const categoryinfo=async(req,res)=>{
    try {
        const cat = await Category.find({})
        res.render("category",{cat})
    } catch (error) {
        console.log("error loading category info")
    }
}

const addcategories = async (req, res) => {
    try {
        const { name, description } = req.body;
        const existingCategory = await Category.findOne({ name });
        if (existingCategory) {
            console.log("Category already exists:", existingCategory); 
            return res.status(400).json({ error: "Category already exists" });
        }

        const createCategory = new Category({
            name,
            description,
        });
        
        await createCategory.save();

        return res.json({ message: "Category added successfully" });

    } catch (error) {
    
        console.error("Error adding category:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};
const listcat=async(req,res)=>{
    try {
        let id=req.query.id
       console.log("query",id)
        await Category.updateOne({_id:id},{$set:{isListed:false}})
        let list=await Category.findOne({_id:id})
        console.log(list)
        res.redirect("/admin/category")
    } catch (error) {
        console.log("error",error)
    }
}

const unlistcat=async(req,res)=>{
    try {
        let id=req.query.id
        console.log("query2 ",id)
        await Category.updateOne({_id:id},{$set:{isListed:true}})
        let list=await Category.findOne({_id:id})
        console.log(list)
        res.redirect("/admin/category")
    } catch (error) {
        console.log(error)
    }
}

const getEditCategory = async (req,res) => {
    try {
        
        const id = req.query.id;
        const category = await Category.findOne({_id:id});
        res.render('edit-category',{category:category,message:""})

    } catch (error) {
        res.redirect('/pagenotfound')
    }
}

const editcat = async (req,res) => {
    try {
        
        const id = req.params.id;
        console.log(id);
        const {name,description} = req.body;
        const currentCategory = await Category.findById(id);

        if (!currentCategory) {
            return res.status(404).json({ error: "Category not found" });
        }

        const updatecategory = await Category.findByIdAndUpdate(id,{
            name:name,
            description:description
        },{new:true});

        if(updatecategory){
            res.redirect('/admin/category')
        }else{
            res.status(404).json({error:"category not found"})
        }

    } catch (error) {
        console.log("error",error)
        res.status(500).json({error:"Internal server error"})
    }
}
module.exports={
    addcategories,
    categoryinfo,
    listcat,
    unlistcat,
    editcat,
    getEditCategory
}