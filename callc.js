#! /usr/bin/env node
let acorn = require('acorn-jsx');
const falafel = require('falafel');
const findit = require('findit');
const fs = require('fs');
const injectObjectSpread = require('acorn-object-spread/inject');
const path = require('path');
const program = require('commander');

acorn = injectObjectSpread(acorn);
const acornOpts = {
    parser: acorn,
    plugins: {jsx: true, objectSpread: true},
    sourceType: 'module',
    ecmaVersion: 8,
    allowImportExportEverywhere: true,
    allowReserved: true
};

const streambedDir = '/home/ben/plotly/streambed';
const filewell = 'shelly/filewell/static/filewell/src';
const SRC_DIR = path.join(streambedDir, filewell);

const ignoreDirs = ['__tests__', '__mocks__', 'node_modules', 'build'];
const isJS = filename => path.extname(filename) === '.js';

program
    .usage('[options] <fileOfFunctionDeclarations>')
    .option('-s, --source <sourceDir>',
            'Code source directory containing call sites')
    .option('-c, --counts',
            'Only show total counts of callsites')
    .option('-d, --depth <n>',
            'Node depth to search for function declarations',
            parseInt)
    .option('-p, --pretty',
            'Output pretty JSON')
    .parse(process.argv);


const declarationFile = program.args[0];
if (!declarationFile) {
    program.outputHelp();
    process.exit(1);
}

run(declarationFile);

function run(filename) {

    const depth = program.depth ? program.depth : 0,
          src = fs.readFileSync(filename, {encoding: 'utf-8'});

    const funclist = getDeclarations(src, depth);

    if (!program.source) {
        print(funclist, program.pretty);
        process.exit(0);
    }

    const funcmap = {};
    funclist.forEach(function(func) {
        funcmap[func] = {};
    });

    const finder = findit(program.source);

    finder.on('directory', (dir, stat, stop) => {
        const base = path.basename(dir);
        if (ignoreDirs.includes(base)) {
            stop();
        }
    });

    finder.on('file', function (file) {
        if (isJS(file)) {
            gatherCallExpressions(file, funcmap);
        }
    });

    finder.on('end', function() {
        // counts only
        if (program.counts) {
            const counts = {};
            Object.keys(funcmap).forEach(key => {
                const calls = funcmap[key];
                let count = 0;
                Object.keys(calls).forEach(callfile => {
                    count += calls[callfile];
                });
                counts[key] = count;
            });
            print(counts, program.pretty);

        } else {

            print(funcmap, program.pretty);
        }

        process.exit(0);
    });
}

function getDeclarations(src, depth) {
    const declarations = [];
    falafel(src, acornOpts, function (node) {
        if (node.type === 'FunctionDeclaration')
            if (getDepth(node) === depth)
                declarations.push(node.id.name);
    });
    return declarations;
}

function gatherCallExpressions(filename, funcmap = {}) {
    const src = fs.readFileSync(filename, {encoding: 'utf-8'});
    const relpath = path.relative(SRC_DIR, filename);

    falafel(src, acornOpts, node => {
        if (node.type === 'CallExpression') {

            let callee = node.callee;

            /*
             * Right now we hunt for global like calls not member callee
             * expressions. Though we can start to do so by looking and
             * digging into callee.type === 'MemberExpression'
             */
            if (callee.type === 'MemberExpression') {
                callee = callee.property;
            }

            // only consider functions already set in the map
            if (funcmap[callee.name]) {

                // increment the count of this call at this filename
                if (!funcmap[callee.name][relpath]) {
                    funcmap[callee.name][relpath] = 0;
                }
                funcmap[callee.name][relpath]++;
            }
        }
    });
}

function getDepth(node, depth) {

    if (node.type === 'Program') {
        return -1;
    }

    if (!depth) {
        depth = 0;
    }
    var np = node.parent;

    if (np.type !== 'Program') {
        if (np.type === 'FunctionDeclaration') {

            depth += 1;
            return getDepth(np, depth);
        }

        return getDepth(np, depth);
    }

    return depth;
}

function print(o, pretty) {
    if (pretty) {
        console.log(JSON.stringify(o, null, 2));
    } else {
        console.log(JSON.stringify(o));
    }
}
