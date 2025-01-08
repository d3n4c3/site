document.addEventListener("DOMContentLoaded", function () {
    const quoteText = document.getElementById("quote");
    const quoteAuthor = document.getElementById("author");
    const newQuoteBtn = document.getElementById("new-quote");

    async function fetchQuotes() {
        try {
            const response = await fetch("quotes.JSON");
            const quotes = await response.json();
            return quotes;
        } catch (error) {
            console.error("Error fetching quotes:", error);
        }
    }

    function displayQuote(quotes) {
        const randomIndex = Math.floor(Math.random() * quotes.length);
        const quote = quotes[randomIndex];
        quoteText.innerHTML = quote.quote;
        quoteAuthor.textContent = `— ${quote.author}`;
    }

    async function getNewQuote() {
        const quotes = await fetchQuotes();
        displayQuote(quotes);
    }

    newQuoteBtn.addEventListener("click", getNewQuote);

    // Load a quote when the page loads
    getNewQuote();
});
