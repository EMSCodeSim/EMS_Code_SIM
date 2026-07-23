// Get today's date in YYYY-MM-DD format
const today = new Date().toISOString().split("T")[0];

// Reference to today's quiz in Firebase
const quizRef = firebase.database().ref("/quizzes/" + today);

// Load and display quiz
quizRef.once("value")
  .then(snapshot => {
    const quizContainer = document.getElementById("quiz-container");
    quizContainer.innerHTML = "";

    if (!snapshot.exists()) {
      quizContainer.innerHTML = "<p>No quiz found for today.</p>";
      return;
    }

    snapshot.forEach((childSnapshot, index) => {
      const q = childSnapshot.val();

      const questionBox = document.createElement("div");
      questionBox.innerHTML = `
        <p><strong>Q${index + 1}:</strong> ${q.question}</p>
        <ul>
          ${q.choices.map(choice => `<li>${choice}</li>`).join("")}
        </ul>
      `;

      quizContainer.appendChild(questionBox);
    });
  })
  .catch(error => {
    console.error("Error loading quiz:", error);
    document.getElementById("quiz-container").innerHTML = "<p>Error loading quiz.</p>";
  });
