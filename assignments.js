/* Public starter lessons for the static, no-login pilot.
   Student work is stored only on the student's device. */
window.MT_ASSIGNMENTS = [
  {
    id: "csf-hello", course: "CSF", type: "javascript",
    unit: "Getting Started", title: "Hello, Developer",
    time: "Beginner", label: "First program",
    summary: "Write your first lines of real JavaScript and make the computer say something useful.",
    objectives: ["Change a message stored in a variable.", "Print at least three different lines.", "Explain what console.log does."],
    steps: ["Read the code, then press Run.", "Replace the greeting with a message of your own.", "Add two new console.log statements.", "Download your completed code to keep a copy."],
    stretch: "Create two variables for a name and favorite hobby, then include them in a sentence.",
    code: [
      "// Welcome to MrTullyClass!",
      "// Lines starting with // are comments.",
      "const student = \"Developer\";",
      "console.log(\"Hello, \" + student + \"!\");",
      "",
      "// TODO: Write two more messages below.",
      ""
    ].join("\n")
  },
  {
    id: "csf-user-input", course: "CSF", type: "javascript",
    unit: "Getting Started", title: "Interactive Conversation",
    time: "Beginner", label: "User input",
    summary: "Ask someone a question and make your program react to what they type.",
    objectives: [
      "Use await readLine() to get a text response.",
      "Use await readInt() to get a whole number.",
      "Include user input in a calculation and a message."
    ],
    steps: [
      "Press Run. Answer both questions in the output panel.",
      "Change the first question to something original.",
      "Ask for a second whole number and print the sum of both numbers.",
      "Use await readFloat() to ask for a decimal, then display the result."
    ],
    stretch: "Build a two-question quiz with different responses for correct and incorrect answers.",
    code: [
      "// This program asks the user questions in the output panel.",
      "// Use await so the program waits for each answer.",
      "const name = await readLine(\"What name should I call you?\");",
      "const favoriteNumber = await readInt(\"Choose a whole number:\");",
      "",
      "console.log(\"Hello, \" + name + \"!\");",
      "console.log(\"Twice your number is \" + (favoriteNumber * 2));",
      "",
      "// TODO: Ask for another whole number and print the sum.",
      "// TODO: Try readFloat() to accept a decimal number."
    ].join("\n")
  },
  {
    id: "csf-scoreboard", course: "CSF", type: "javascript",
    unit: "Programming Basics", title: "Scoreboard Lab",
    time: "Beginner", label: "Variables",
    summary: "Create the logic behind an arcade scoreboard using variables and math.",
    objectives: ["Update a variable using arithmetic.", "Predict a program's final score.", "Use an if statement to check a milestone."],
    steps: ["Run the starter to see the first score.", "Award 25 points for a bonus round.", "Subtract 10 points for a missed target.", "Add a condition that prints LEVEL UP when the score is at least 100."],
    stretch: "Add a comboMultiplier variable and use it to calculate a bonus.",
    code: [
      "let score = 70;",
      "console.log(\"Starting score: \" + score);",
      "",
      "// TODO: Add 25 points to score.",
      "",
      "// TODO: Subtract 10 points.",
      "",
      "// TODO: Check whether score is at least 100.",
      "",
      "console.log(\"Final score: \" + score);"
    ].join("\n")
  },
  {
    id: "csf-decisions", course: "CSF", type: "javascript",
    unit: "Programming Basics", title: "Decision Engine",
    time: "Beginner", label: "Conditionals",
    summary: "Use comparisons and if/else statements to turn numbers into decisions.",
    objectives: ["Write a comparison using >=.", "Build an if/else branch.", "Test your logic with more than one input."],
    steps: ["Run the example.", "Change energy to 0, 10, and 50 and compare the results.", "Write a second condition: if health is 0, print GAME OVER; otherwise print KEEP GOING.", "Test both branches."],
    stretch: "Add an else if branch for low energy (less than 5).",
    code: [
      "let energy = 8;",
      "let health = 3;",
      "",
      "if (energy >= 10) {",
      "  console.log(\"Special move available!\");",
      "} else {",
      "  console.log(\"Keep charging your energy.\");",
      "}",
      "",
      "// TODO: Make the game-over check here."
    ].join("\n")
  },
  {
    id: "csf-loops", course: "CSF", type: "javascript",
    unit: "Programming Basics", title: "Loop Detective",
    time: "Developing", label: "Loops",
    summary: "Make repeated tasks predictable using a for loop.",
    objectives: ["Explain why a loop stops.", "Change the start, end, and step values.", "Use a loop to calculate a running total."],
    steps: ["Predict the output before pressing Run.", "Change the loop so it counts from 2 to 10 by twos.", "Write another loop that adds the numbers 1 through 5 to a total.", "Print the total."],
    stretch: "Make a countdown from 10 to 0 and print BLAST OFF after it ends.",
    code: [
      "for (let number = 1; number <= 5; number++) {",
      "  console.log(\"Count: \" + number);",
      "}",
      "",
      "// TODO: Count by twos from 2 to 10.",
      "",
      "let total = 0;",
      "// TODO: Add the numbers 1 through 5.",
      "console.log(\"Total: \" + total);"
    ].join("\n")
  },
  {
    id: "csf-web", course: "CSF", type: "html",
    unit: "Web Fundamentals", title: "Build Your First Webpage",
    time: "Beginner", label: "HTML + CSS",
    summary: "Create an actual webpage with headings, paragraphs, colors, and a personal project card.",
    objectives: ["Recognize HTML elements.", "Edit CSS colors and spacing.", "Create a visible project card."],
    steps: ["Press Preview to see the starter webpage.", "Change the heading and introduction.", "Choose new background and card colors in the style section.", "Add another project card under the first."],
    stretch: "Add a navigation menu with links to sections on the same page.",
    code: [
      "<!doctype html>",
      "<html lang=\"en\">",
      "<head>",
      "  <meta charset=\"utf-8\">",
      "  <title>My First Webpage</title>",
      "  <style>",
      "    body { font-family: Arial, sans-serif; background: #eaf5ff; color: #19304b; padding: 28px; }",
      "    .card { background: white; padding: 20px; border-radius: 12px; max-width: 420px; }",
      "  </style>",
      "</head>",
      "<body>",
      "  <h1>Welcome to my website!</h1>",
      "  <div class=\"card\">",
      "    <h2>My first project</h2>",
      "    <p>I'm learning to make webpages with real code.</p>",
      "  </div>",
      "</body>",
      "</html>"
    ].join("\n")
  },
  {
    id: "cs3-canvas", course: "CS3", type: "javascript",
    unit: "Creative Coding", title: "Canvas Art Studio",
    time: "Developing", label: "Graphics",
    summary: "Draw a piece of procedural art on a canvas using JavaScript.",
    objectives: ["Use a drawing context.", "Work with x/y coordinates.", "Create a graphic from several shapes."],
    steps: ["Press Run and examine the canvas.", "Move the shapes by changing coordinates.", "Add at least three new shapes.", "Use a loop to create a repeated pattern."],
    stretch: "Write a drawStar(x, y, size) function and reuse it.",
    code: [
      "const canvas = document.getElementById(\"stage\");",
      "const ctx = canvas.getContext(\"2d\");",
      "ctx.fillStyle = \"#0d2540\";",
      "ctx.fillRect(0, 0, canvas.width, canvas.height);",
      "",
      "ctx.fillStyle = \"#f7be63\";",
      "ctx.fillRect(80, 70, 150, 90);",
      "ctx.fillStyle = \"#59d2cf\";",
      "ctx.beginPath();",
      "ctx.arc(330, 150, 55, 0, Math.PI * 2);",
      "ctx.fill();",
      "",
      "// TODO: Add your own shapes and a repeated pattern.",
      "console.log(\"Your artwork is ready.\");"
    ].join("\n")
  },
  {
    id: "cs3-movement", course: "CS3", type: "javascript",
    unit: "Creative Coding", title: "Keyboard Movement",
    time: "Developing", label: "Events",
    summary: "Move a character on the screen using real JavaScript keyboard events.",
    objectives: ["Respond to keydown events.", "Update x/y coordinates.", "Prevent the player leaving the canvas."],
    steps: ["Press Run, then click the preview and use the arrow keys.", "Change the player's speed.", "Add top and bottom boundaries.", "Change the player's appearance."],
    stretch: "Add a collectible target and calculate a score when the player reaches it.",
    code: [
      "const canvas = document.getElementById(\"stage\");",
      "const ctx = canvas.getContext(\"2d\");",
      "let x = 100;",
      "let y = 100;",
      "const speed = 15;",
      "",
      "function draw() {",
      "  ctx.clearRect(0, 0, canvas.width, canvas.height);",
      "  ctx.fillStyle = \"#257d91\";",
      "  ctx.fillRect(x, y, 40, 40);",
      "}",
      "",
      "document.addEventListener(\"keydown\", function(event) {",
      "  if (event.key === \"ArrowRight\") x += speed;",
      "  if (event.key === \"ArrowLeft\") x -= speed;",
      "  // TODO: Add ArrowUp and ArrowDown.",
      "  x = Math.max(0, Math.min(canvas.width - 40, x));",
      "  draw();",
      "});",
      "draw();",
      "console.log(\"Click the preview, then use arrow keys.\");"
    ].join("\n")
  },
  {
    id: "cs3-data", course: "CS3", type: "javascript",
    unit: "Data & Algorithms", title: "Analyze a Game Leaderboard",
    time: "Developing", label: "Arrays",
    summary: "Sort, filter, and summarize scores using JavaScript arrays.",
    objectives: ["Read arrays and objects.", "Find the highest score.", "Calculate an average."],
    steps: ["Run the starter to display every score.", "Sort the scores from highest to lowest.", "Print only players with at least 80 points.", "Calculate and print the average score."],
    stretch: "Find the second-highest unique score.",
    code: [
      "const players = [",
      "  { name: \"Avery\", score: 91 },",
      "  { name: \"Jordan\", score: 74 },",
      "  { name: \"Riley\", score: 86 },",
      "  { name: \"Casey\", score: 95 }",
      "];",
      "players.forEach(function(player) {",
      "  console.log(player.name + \": \" + player.score);",
      "});",
      "",
      "// TODO: Sort, filter, and calculate the average."
    ].join("\n")
  },
  {
    id: "apcsa-intro", course: "AP CSA", type: "java",
    unit: "Java Fundamentals", title: "Java Main Method",
    time: "Beginner", label: "Java draft",
    summary: "Practice the structure of a Java class and main method. Java execution is not available in this browser-only pilot.",
    objectives: ["Identify class and main method syntax.", "Change output text.", "Add correctly typed variables."],
    steps: ["Review the Java starter carefully.", "Add a String variable called course.", "Print a second line using course.", "Download the .java file for testing in your approved Java environment."],
    stretch: "Add two int values and print their sum.",
    code: [
      "public class Main {",
      "    public static void main(String[] args) {",
      "        System.out.println(\"Hello, Java!\");",
      "        // TODO: Add a String named course.",
      "        // TODO: Print that variable.",
      "    }",
      "}"
    ].join("\n")
  },
  {
    id: "apcsa-conditions", course: "AP CSA", type: "java",
    unit: "Java Fundamentals", title: "Java Decision Logic",
    time: "Developing", label: "Java draft",
    summary: "Design if/else logic that determines a student's letter grade from a numeric score.",
    objectives: ["Use if/else if/else in Java.", "Compare integer values.", "Test boundary cases on paper or in a Java IDE."],
    steps: ["Read the existing logic.", "Add branches for B, C, and D grades.", "Use else for scores below 60.", "Download the source and test boundary values such as 89 and 90."],
    stretch: "Add validation for scores outside the range 0 to 100.",
    code: [
      "public class Main {",
      "    public static void main(String[] args) {",
      "        int score = 93;",
      "        if (score >= 90) {",
      "            System.out.println(\"A\");",
      "        }",
      "        // TODO: Add B, C, D, and F logic.",
      "    }",
      "}"
    ].join("\n")
  },
  {
    id: "apcsa-arrays", course: "AP CSA", type: "java",
    unit: "Algorithms", title: "Array Average Challenge",
    time: "Developing", label: "Java draft",
    summary: "Practice Java arrays, traversal, and casting without needing a live Java compiler.",
    objectives: ["Use an enhanced for loop.", "Calculate a sum.", "Avoid integer division when calculating a mean."],
    steps: ["Predict the printed output.", "Finish the loop that totals the array.", "Compute the average as a double.", "Download the source to compile and test."],
    stretch: "Find the largest value in the array without sorting.",
    code: [
      "public class Main {",
      "    public static void main(String[] args) {",
      "        int[] scores = {78, 92, 84, 100, 86};",
      "        int total = 0;",
      "        // TODO: Use a for-each loop to add up the scores.",
      "        double average = 0.0;",
      "        // TODO: Calculate the correct average.",
      "        System.out.println(\"Average: \" + average);",
      "    }",
      "}"
    ].join("\n")
  }
];