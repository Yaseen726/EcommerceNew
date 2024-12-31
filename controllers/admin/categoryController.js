const Category=require("../../models/categorySchema")
const Product=require("../../models/productSchema")


const categoryInfo = async (req, res) => {
    try {
        const perPage = 3; // Number of categories per page
        const page = parseInt(req.query.page) || 1; // Current page number (default: 1)
        const searchQuery = req.query.search || ""; // Search keyword

        const filter = searchQuery
            ? {
                $or: [
                      { name: { $regex: searchQuery, $options: "i" } }, // Case-insensitive match for name
                 // Case-insensitive match for description
                ],
              }
            : {}; // If no search, return all categories

        const totalCategories = await Category.countDocuments(filter); // Total categories matching the filter
        const totalPages = Math.ceil(totalCategories / perPage); // Calculate total pages

        // Fetch categories with pagination
        const cat = await Category.find(filter)
            .skip((page - 1) * perPage)
            .limit(perPage);

        res.render("category", {
            cat,
            currentPage: page,
            totalPages,
            searchQuery
        });
    } catch (error) {
        console.error("Error Loading Category info", error);
        res.status(500).send("Server Error");
    }
};



// const addcategories = async (req, res) => {
//     try {
//         const { name, description } = req.body;
//         const existingCategory = await Category.findOne({ name });
//         if (existingCategory) {
//             return res.status(400).json({success:false,message:"Category already exist"})
//         }

//         const createCategory = new Category({
//             name,
//             description,
//         });
        
//         await createCategory.save();
//         return res.status(200).json({success:true,message:"Category Added successfully"})
//     } catch (error) {
//         console.error("Error adding category:", error);
//         return res.status(500).json({ error: "Internal Server Error" });
//     }
// };


const addcategories = async (req, res) => {
    try {
        const { name, description } = req.body;

        // Convert the category name to lowercase for case-insensitive comparison
        const existingCategory = await Category.findOne({ name: { $regex: new RegExp('^' + name.trim() + '$', 'i') } });

        if (existingCategory) {
            return res.status(400).json({ success: false, message: "Category already exists" });
        }

        const createCategory = new Category({
            name,
            description,
        });

        await createCategory.save();
        return res.status(200).json({ success: true, message: "Category Added successfully" });
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


const EditCategories = async (req, res) => {
    const id = req.query.id;

    if (!id) {
        return res.status(400).json({ success: false, message: "Category ID is missing" });
    }

    try {
        console.log(req.body,"from the fetching")
        const { name, description } = req.body;
        console.log(name,description,"name and description")

        if (!name || !description) {
            return res.status(400).json({ success: false, message: "Name or Description is missing" });
        }
        

        const updatedCategory = await Category.findByIdAndUpdate(
            id,
            { name, description },
            { new: true } // Return the updated document
        );
        console.log(updatedCategory,"updated category side")
        if (!updatedCategory) {
            return res.status(404).json({ success: false, message: "Category not found" });
        }

        return res.status(200).json({ success: true, message: "Category updated successfully", category: updatedCategory });
    } catch (error) {
        console.error("Error updating category:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};



const addCategoryOffer = async (req, res) => {
    try {
        const percentage = parseInt(req.body.percentage, 10);
        const categoryId = req.body.categoryId;

        // Find the category
        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(400).json({ status: false, message: "Category not found" });
        }

        // Fetch all products in the category
        const products = await Product.find({ category: category._id });

        // Check if any product has a product-specific offer
        for (const product of products) {
            if (product.productOffer > 0) {
                return res.status(400).json({
                    status: false,
                    message: "Cannot set category offer. Some products already have individual offers.",
                });
            }
        }

        // Update category offer
        await Category.updateOne({ _id: categoryId }, { $set: { categoryOffer: percentage } });

        // Apply category offer to products
        for (const product of products) {
            product.salePrice = product.salePrice - Math.floor(product.salePrice * (percentage / 100));
            await product.save();
        }

        return res.status(200).json({ status: true, message: "Category offer set successfully" });
    } catch (error) {
        console.error("Error in addCategoryOffer:", error);
        return res.status(500).json({ status: false, message: "Internal Server Error" });
    }
};



const removeCategoryOffer = async (req, res) => {
    try {
        const categoryId = req.body.categoryId;

        // Find the category
        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(404).json({ status: false, message: "Category not found" });
        }

        // Fetch all products in the category
        const products = await Product.find({ category: category._id });

        // Remove category offer from products
        const percentage = category.categoryOffer;
        for (const product of products) {
            product.salePrice = product.salePrice / (1 - percentage / 100); // Revert category discount
            await product.save();
        }

        // Reset the category offer
        category.categoryOffer = 0;
        await category.save();

        return res.status(200).json({ status: true, message: "Category offer removed successfully" });
    } catch (error) {
        console.error("Error in removeCategoryOffer:", error);
        return res.status(500).json({ status: false, message: "Internal Server Error" });
    }
};




module.exports={
    addcategories,
    categoryInfo,
    listunlist,
    EditCategories,
    getEditCategory,
    addCategoryOffer,
    removeCategoryOffer

}