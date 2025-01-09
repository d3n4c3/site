document.addEventListener("DOMContentLoaded", function () {
    const quoteText = document.getElementById("quote");
    const quoteAuthor = document.getElementById("author");
    const newQuoteBtn = document.getElementById("new-quote");

    async function fetchQuotes() {
        try {
            const response = await fetch("quotes.json?cache-bust=" + new Date().getTime());
            const quotes = await response.json();
            console.log("Fetched quotes:", quotes); // Add this line
            return quotes;
        } catch (error) {
            console.error("Error fetching quotes:", error);
        }
    }

    function getRandomIndex(max) {
        const array = new Uint32Array(1);
        window.crypto.getRandomValues(array);
        return array[0] % max;
    }

    function displayQuote(quotes) {
        console.log("Quotes in displayQuote:", quotes); // Add this line
        const randomIndex = getRandomIndex(quotes.length);
        const quote = quotes[randomIndex];
        quoteText.innerHTML = quote.text;
        quoteAuthor.textContent = `— ${quote.author}`;
    }


    async function getNewQuote() {
        const quotes = await fetchQuotes();
        console.log("Quotes in getNewQuote:", quotes); // Add this line
        displayQuote(quotes);
    }


    newQuoteBtn.addEventListener("click", getNewQuote);

    // Load a quote when the page loads
    getNewQuote();
});
