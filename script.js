// Load a random quote from the quotes.json file
async function fetchQuotes() {
    try {
        const response = await fetch("quotes.json");
        const arrayBuffer = await response.arrayBuffer();
        const decoder = new TextDecoder("utf-8");
        const jsonText = decoder.decode(arrayBuffer);
        const quotes = JSON.parse(jsonText);
        return quotes;
    } catch (error) {
        console.error("Error fetching quotes:", error);
        return [];
    }
}

// Display a random quote
async function displayRandomQuote() {
    const quotes = await fetchQuotes();
    console.log(quotes); // Log the fetched quotes to the console
    if (quotes.length > 0) {
        const randomIndex = Math.floor(Math.random() * quotes.length);
        const randomQuote = quotes[randomIndex];
        document.getElementById("quote").textContent = `"${randomQuote.q}"`;
        document.getElementById("author").textContent = `- ${randomQuote.a}`;
    } else {
        document.getElementById("quote").textContent = "No quotes available.";
        document.getElementById("author").textContent = "";
    }
}

// Event listener for the "New Quote" button
document.getElementById("new-quote").addEventListener("click", displayRandomQuote);

// Initial quote display on page load
window.onload = displayRandomQuote;