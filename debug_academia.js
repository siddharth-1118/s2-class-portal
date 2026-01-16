try {
    console.log("Loading academia.js...");
    require('./server/routes/academia');
    console.log("Success!");
} catch (e) {
    console.error("Error loading academia.js:");
    console.error(e);
}
