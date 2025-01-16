// Wait until the DOM is fully loaded
document.addEventListener("DOMContentLoaded", function () {
    // Select all buttons with the shared class 'calendly-button'
    const calendlyButtons = document.querySelectorAll(".calendly-button");

    // Attach click event listener to each button
    calendlyButtons.forEach(button => {
        button.addEventListener("click", function () {
            Calendly.initPopupWidget({ 
                url: 'https://calendly.com/feeny-jamie/programming-consultation' 
            });
        });
    });
});

