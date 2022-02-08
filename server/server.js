const express = require('express');
const fs = require('fs');
const app = express();
const port = process.env.PORT || 5000;

// require TEST_OUTPUT_DIR env var
if (!process.env.TEST_OUTPUT_DIR) {
  console.log('TEST_OUTPUT_DIR env var is required. TEST_OUTPUT_DIR is path to bitempura test outputs to visualize.');
  process.exit();
}
const testOutputDir = process.env.TEST_OUTPUT_DIR;

// start Express server and serve routes.
app.listen(port, () => console.log(`Listening on port ${port}`));

app.get('/express_backend', (req, res) => {
  res.send({ express: 'YOUR EXPRESS BACKEND IS CONNECTED TO REACT' });
});

app.get('/test_output', (req, res) => {
  let out = {
    tests: [],
    test_output_dir: testOutputDir,
  };
  var filenames = fs.readdirSync(testOutputDir);
  filenames.forEach((file, idx) => {
    let json = fs.readFileSync(testOutputDir + "/" + file);
    out.tests.push(JSON.parse(json))
  });

  res.json(out)
});
