#!/usr/bin/env node

'use strict';

const execSync = require('child_process').execSync;
const path = require('path');
const fs = require('fs');

const globby = require('globby');

const EXT = '.bson';

const database = process.argv[2];
const dirs = process.argv.slice(3);

const log = (logLine) => process.stdout.write(`${logLine}\n`);

if (!database || dirs.length === 0) {
  process.stdout.write(`Usage:\n\n  ${path.basename(process.argv[1])} database [...file|dir]\n`);
  process.exit(0);
}

const globs = dirs.map((dir) => {
  const stat = fs.statSync(dir);
  if (stat.isFile()) {
    return dir;
  } else if (stat.isDirectory()) {
    return `${dir}/*${EXT}`;
  }
  return dir;
});

const files = globby.sync(globs);

log(`import ${files.length} file(s) [${files.join(', ')}] into ${database}`)

files.forEach((file) => {
  log(`fixing ${file}`)
  const metadataFile = path.join(path.dirname(file), path.basename(file, EXT) + '.metadata.json');
  const metadata = JSON.parse(fs.readFileSync(metadataFile));
  metadata.indexes.forEach((index) => {
    if (index.safe == null) {
      delete index.safe;
    }
  });
  fs.writeFileSync(metadataFile, JSON.stringify(metadata), { encoding: 'utf8' });
  log(`importing ${file} [mongorestore --drop -d ${database} ${file}]`);
  execSync(`mongorestore --drop -d ${database} ${file}`);
  log(`imported ${file}`)
});
