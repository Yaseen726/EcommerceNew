const Order=require("../../models/orderSchema")
const Product=require("../../models/productSchema")
const loadDashboard = async (req, res) => {
    try {
        console.log(req.session.Admin,"admin is session")
        if (req.session.Admin) {
            const salesData = await getTotalSales();
            const products = await getMostSellingProducts();
            const categories = await getMostSellingCategories();

            const count = await Order.countDocuments();

            res.render('Admindashboard', { salesData, products, categories, count });
        } else {
            res.redirect('/admin/login');
        }
    } catch (error) {
        console.error("Error loading dashboard:", error);
        res.redirect('/pageerror');
    }
};


async function getTotalSales() {
    try {
        // Total Sales Amount
        const totalSales = await Order.aggregate([
            {
                $group: {
                    _id: null,
                    totalSalesAmount: { $sum: "$finalAmount" }
                }
            }
        ]);

        // Weekly Sales
        const weeklySales = await Order.aggregate([
            {
                $match: {
                    createdOn: {
                        $gte: new Date(new Date().getFullYear(), 0, 1) // Start of current year
                    }
                }
            },
            {
                $group: {
                    _id: { $isoWeek: "$createdOn" }, // Group by ISO week
                    sales: { $sum: "$finalAmount" }
                }
            }
        ]);

        // Monthly Sales
        const monthlySales = await Order.aggregate([
            {
                $match: {
                    createdOn: {
                        $gte: new Date(new Date().getFullYear(), 0, 1) // Start of current year
                    }
                }
            },
            {
                $group: {
                    _id: { $month: "$createdOn" }, // Group by month
                    sales: { $sum: "$finalAmount" }
                }
            }
        ]);

        // Yearly Sales
        const yearlySales = await Order.aggregate([
            {
                $group: {
                    _id: { $year: "$createdOn" }, // Group by year
                    sales: { $sum: "$finalAmount" }
                }
            },
            { $sort: { "_id": 1 } }, // Sort by year
            { $limit: 5 } // Last 5 years
        ]);

        // Prepare chart labels for weeks, months, and years
        const weekLabels = Array.from({ length: 52 }, (_, i) => `Week ${i + 1}`);
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const currentYear = new Date().getFullYear();
        console.log(currentYear)
        const yearLabels = Array.from({ length: 5 }, (_, i) => (currentYear - 4 + i).toString());

        // Adjust yearly sales
        const formattedYearlySales = yearLabels.map(year => {
            const found = yearlySales.find(item => item._id === parseInt(year)); // Find matching year
            return found ? found.sales : 0; // If found, use its sales; otherwise, use 0
        });

        return {
            totalSalesAmount: totalSales.length > 0 ? totalSales[0].totalSalesAmount : 0,
            weekly: formatChartData(weeklySales, 52, weekLabels),
            monthly: formatChartData(monthlySales, 12, monthNames),
            yearly: {
                labels: yearLabels,
                data: formattedYearlySales
            }
        };
    } catch (error) {
        console.error("Error calculating sales data:", error);
        return {
            totalSalesAmount: 0,
            weekly: { labels: [], data: [] },
            monthly: { labels: [], data: [] },
            yearly: { labels: [], data: [] }
        };
    }
}


function formatChartData(data, length, labels = null) {
    // Generate default labels if not provided
    const chart = {
        labels: labels || Array.from({ length }, (_, i) => `Year ${i + 1}`),
        data: Array(length).fill(0)
    };

    // Populate the data array based on input data
    data.forEach(item => {
        const index = item._id - 1; // Adjust to zero-based index for consistency
        if (index >= 0 && index < length) {
            chart.data[index] = item.sales;
        }
    });

    return chart;
}


async function getMostSellingProducts() {
    try {
        // Step 1: Filter orders with "delivered" status
        const deliveredOrders = await Order.find({ status: "delivered" });

        const productSales = {};

        // Step 2: Loop through the delivered orders
        deliveredOrders.forEach(order => {
            order.orderedItem.forEach(item => {
                const productId = item.product.toString(); // Assuming `product` is the ObjectId

                // Step 3: Count the products
                if (productSales[productId]) {
                    productSales[productId]++;
                } else {
                    productSales[productId] = 1;
                }
            });
        });
        console.log(productSales,"product sales side")

        // Step 4: Sort the products by the sales count and limit the result to top 10
        const sortedProductSales = Object.entries(productSales)
            .sort((a, b) => b[1] - a[1])  // Sort by sales count in descending order
            .slice(0, 10); // Get the top 10
    console.log(sortedProductSales,"top sorted product sales")
        // Step 5: Fetch product details for the top-selling products
        const topSellingProducts = await Product.find({
            _id: { $in: sortedProductSales.map(item => item[0]) }
        });
    console.log(topSellingProducts,"top topSellingProducts")
        return topSellingProducts.map(product => ({
            productId: product._id.toString(),
            productName: product.productName,
            totalQuantitySold: productSales[product._id.toString()]
        }));

    } catch (error) {
        console.error("Error finding most selling products:", error);
        return [];
    }
}

async function getMostSellingCategories() {
    try {
        const result = await Order.aggregate([
            { $unwind: "$orderedItem" },  // Flatten ordered items in the order
            {
                $lookup: {
                    from: "products",
                    localField: "orderedItem.product",  // Match the product ID in the order
                    foreignField: "_id",  // Foreign field in the products collection
                    as: "productDetails"
                }
            },
            { $unwind: "$productDetails" },  // Flatten product details
            {
                $lookup: {
                    from: "categories",
                    localField: "productDetails.category",  // Match the category ID in the product
                    foreignField: "_id",  // Foreign field in the categories collection
                    as: "categoryDetails"
                }
            },
            { $unwind: "$categoryDetails" },  // Flatten category details
            {
                $group: {
                    _id: "$productDetails.category",  // Group by category ID
                    categoryName: { $first: "$categoryDetails.name" },  // Get category name
                    totalQuantitySold: { $sum: 1 }  // Count the number of products ordered in each category
                }
            },
            { $sort: { totalQuantitySold: -1 } },  // Sort by total quantity sold in descending order
            { $limit: 10 }  // Limit to top 10 categories
        ]);

        // Map the result to the desired format
        return result.map(item => ({
            categoryId: item._id.toString(),
            categoryName: item.categoryName,
            totalQuantitySold: item.totalQuantitySold
        }));
    } catch (error) {
        console.error("Error finding most selling categories:", error);
        return [];
    }
}



module.exports={
    loadDashboard,

}