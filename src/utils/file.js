import fs from 'fs'


function readFile(filePath) {
    try {
        if (!fs.existsSync(filePath)) {
            console.error(`File ${filePath} does not exist`)
            process.exit(1)
        }
        return fs.readFileSync(filePath, 'utf8')
    } catch (error) {
        console.error(`Error reading file ${filePath}: ${error}`)
        process.exit(1)
    }
}

function writeFile(filePath, content) {
    try {
        fs.writeFileSync(filePath, content)
    } catch (error) {
        console.error(`Error writing file ${filePath}: ${error}`)
        process.exit(1)
    }
}

export default { readFile, writeFile }