const express = require('express');
const fs = require('fs');
const app = express();
const port = process.env.PORT || 5000;

// require TEST_OUTPUT_DIRS env var
if (!process.env.TEST_OUTPUT_DIRS) {
  console.log('TEST_OUTPUT_DIRS env var is required. TEST_OUTPUT_DIRS is csv of paths to bitempura test output dirs to visualize.');
  process.exit();
}
const testOutputDirsCSV = process.env.TEST_OUTPUT_DIRS;
const testOutputDirs = testOutputDirsCSV.split(",");

// start Express server and serve routes.
app.listen(port, () => console.log(`Listening on port ${port}`));

// tests: list of list of test outputs. each "test output dir" is a top level list
// test_output_dirs: list of test output dirs.
// index order shared between the two output lists is meaningful.
app.get('/test_output', (req, res) => {
  let out = {
    tests: [],
    test_output_dirs: testOutputDirs,
  };

  testOutputDirs.forEach((testOutputDir) => {
    const dirTests = [];
    var filenames = fs.readdirSync(testOutputDir);
    filenames.forEach((file, idx) => {
      let json = fs.readFileSync(testOutputDir + "/" + file);
      dirTests.push(JSON.parse(json))
    });
    out.tests.push(dirTests)
  });

  res.json(out)
});
