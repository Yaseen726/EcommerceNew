const loadHomepage=async(req,res)=>{
    try {
        return res.render("home")
    } catch (error) {
        console.log("Home page not Found") //it is used to see errors in backend or serverside
        res.status(500).send("server error")
    }
}
const pagenotfound=async(req,res)=>{
    try {
        res.render("page-404")
    } catch (error) {
        res.redirect("/pagenotfound")
    }
}

module.exports={
    loadHomepage,
    pagenotfound
}