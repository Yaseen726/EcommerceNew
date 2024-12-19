const Order=require("../../models/orderSchema")
const pdf = require('html-pdf');
const exceljs=require("exceljs")
const loadSalesReport = async (req, res) => {
    try {
        const { startDate, endDate, quickFilter, page = 1, limit = 10 } = req.query;

        const filter = {};
        // Apply date filtering
        if (startDate && endDate) {
            filter.invoiceDate = {
                $gte: new Date(startDate),
                $lte: new Date(endDate),
            };
        }

        // Apply quick filter
        if (quickFilter) {
            const now = new Date();
            if (quickFilter === "1d") {
                filter.invoiceDate = { $gte: new Date(now.setDate(now.getDate() - 1)) };
            } else if (quickFilter === "1w") {
                filter.invoiceDate = { $gte: new Date(now.setDate(now.getDate() - 7)) };
            } else if (quickFilter === "1m") {
                filter.invoiceDate = { $gte: new Date(now.setMonth(now.getMonth() - 1)) };
            }
        }

        // Pagination logic
        const skip = (page - 1) * limit;

        // Fetch filtered and paginated data
        const salesData = await Order.find(filter)
            .sort({ invoiceDate: -1 }) // Latest first
            .skip(skip)
            .limit(limit);

        const totalCount = await Order.countDocuments(filter);
        const totalPages = Math.ceil(totalCount / limit);
        // Metrics (for your cards)
        const metrics = [
            {
                subtitle: "Total Revenue",
                value: "₹" + salesData.reduce((acc, order) => {
                    if (order.status === "delivered") {
                        return acc + order.finalAmount;
                    }
                    return acc;
                }, 0),
                icon: "bi bi-currency-rupee",
                bgColor: "#dfffe2",
                iconColor: "#088178",
            },
            {
                subtitle: "Total Orders",
                value: salesData.length,
                icon: "bi bi-box-seam",
                bgColor: "#e6f3ff",
                iconColor: "#0369a1",
            },
            {
                subtitle: "Completed Orders",
                value: salesData.filter(order => order.status === "delivered").length,
                icon: "bi bi-check-circle",
                bgColor: "#e3fcec",
                iconColor: "#166534",
            },
            {
                subtitle: "Pending Orders",
                value: salesData.filter(order => order.status === "pending").length,
                icon: "bi bi-clock-history",
                bgColor: "#fff7e1",
                iconColor: "#d97706",
            },
        ];

        // Render EJS file
        res.render("salesreport", {
            salesData,
            metrics,
            startDate,
            endDate,
            quickFilter,
            currentPage: Number(page),
            totalPages,
        });
    } catch (error) {
        console.error("Failed to load sales report", error);
        res.status(500).send("Server error");
    }
};

const DownloadPdf = async (req, res) => {
    try {
      // Fetch sales data
    const salesData = await Order.find().sort({ date: -1 });

      // Generate HTML content for the PDF with CSS styling
    let htmlContent = `
        <html>
        <head>
            <style>
            body {
                font-family: Arial, sans-serif;
                margin: 20px;
            }
            h1 {
                text-align: center;
                color: #2E8B57;
                font-size: 28px;
            }
            table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 20px;
            }
            th, td {
                padding: 12px;
                text-align: center;
                border: 1px solid #ddd;
            }
            th {
                background-color: #4CAF50;
                color: white;
            }
            tr:nth-child(even) {
                background-color: #f2f2f2;
            }
            tr:hover {
                background-color: #ddd;
            }
            .total {
                font-weight: bold;
                background-color: #f1c40f;
                color: white;
            }
            .header {
                font-size: 16px;
                font-weight: bold;
            }
            .footer {
                font-size: 12px;
                text-align: center;
                margin-top: 20px;
            }
            </style>
        </head>
        <body>
            <h1>Sales Report</h1>
            <table>
            <thead>
                <tr>
                <th>Order ID</th>
                <th>Date</th>
                <th>Total Amount</th>
                <th>Discount</th>
                <th>Coupon</th>
                <th>Final Amount</th>
                <th>Status</th>
                </tr>
            </thead>
            <tbody>
    `;

    salesData.forEach((order) => {
        htmlContent += `
        <tr>
            <td>${order.id}</td>
            <td>${new Date(order.invoiceDate).toLocaleString()}</td>
            <td>₹${order.totalPrice}</td>
            <td>₹${order.discount}</td>
            <td>${order.couponApplied}</td>
            <td>₹${order.finalAmount}</td>
            <td>${order.status}</td>
        </tr>
        `;
    });

    htmlContent += `
            </tbody>
            </table>
            <div class="footer">Generated by Luxora Market | ${new Date().toLocaleDateString()}</div>
        </body>
        </html>
    `;

      // Generate PDF from HTML content with options
    const options = { format: "A4", border: "10mm" };
    pdf.create(htmlContent, options).toStream((err, stream) => {
        if (err) {
        console.error("Error generating PDF:", err);
        return res.status(500).send("Error generating PDF");
        }

        // Set the response headers to force download of the PDF file
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", "attachment; filename=sales_report.pdf");

        // Pipe the PDF stream to the response
        stream.pipe(res);
    });
    } catch (error) {
    console.error("Error generating PDF:", error);
    res.status(500).send("Server error");
    }
};


const downloadExcel = async (req, res) => {
    try {
      // Fetch sales data
    const salesData = await Order.find().sort({ date: -1 });

      // Create a new Excel workbook
    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet("Sales Report");

      // Add column headers
    worksheet.columns = [
        { header: "Order ID", key: "orderId", width: 20 },
        { header: "Date", key: "date", width: 20 },
        { header: "Total Amount", key: "totalAmount", width: 20 },
        { header: "Discount", key: "discount", width: 20 },
        { header: "Coupon", key: "coupon", width: 20 },
        { header: "Final Amount", key: "finalAmount", width: 20 },
        { header: "Status", key: "status", width: 20 },
    ];

      // Add rows to the worksheet
    salesData.forEach((order) => {
        worksheet.addRow({
        orderId: order.id,
        date: new Date(order.invoiceDate).toLocaleString(),
        totalAmount: order.totalPrice,
        discount: order.discount,
        coupon: order.couponApplied,
        finalAmount: order.finalAmount,
        status: order.status,
        });
    });

      // Set the response headers to force download of the Excel file
    res.setHeader(
        "Content-Disposition",
        "attachment; filename=sales_report.xlsx"
    );
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

      // Write the Excel file to the response
    await workbook.xlsx.write(res);
    res.end();
    } catch (error) {
    console.error("Error generating Excel file:", error);
    res.status(500).send("Server error");
    }
};




module.exports={
    loadSalesReport,
    DownloadPdf,
    downloadExcel
}