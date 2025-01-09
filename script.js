document.addEventListener("DOMContentLoaded", function () {
    const quoteText = document.getElementById("quote");
    const quoteAuthor = document.getElementById("author");
    const newQuoteBtn = document.getElementById("new-quote");

    async function fetchQuotes() {
        try {
            const response = await fetch("quotes.json?cache-bust=" + new Date().getTime());
            const quotes = await response.json();
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
        const randomIndex = getRandomIndex(quotes.length);
        const quote = quotes[randomIndex];
        quoteText.innerHTML = quote.text;
        quoteAuthor.textContent = `- ${quote.author}`;
    }

    async function getNewQuote() {
        const quotes = await fetchQuotes();
        displayQuote(quotes);
    }

    newQuoteBtn.addEventListener("click", getNewQuote);

    // Load a quote when the page loads
    getNewQuote();
});
