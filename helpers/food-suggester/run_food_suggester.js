import { spawn } from "child_process";

export default function runFoodSuggester(location) {
    return new Promise((resolve, reject) => {
        const py = spawn("python", [
            "helpers/food-suggester/food_suggester.py",
            location,
        ]);

        let result = "";
        let errorOutput = "";

        py.stdout.on("data", (data) => {
            result += data.toString();
        });

        py.stderr.on("data", (data) => {
            errorOutput += data.toString();
        });

        py.on("close", (code) => {
            if (code !== 0) {
                reject(
                    new Error(
                        `Python script exited with code ${code}. Error: ${errorOutput}`
                    )
                );
            } else {
                resolve(result);
            }
        });

        py.on("error", (err) => {
            reject(new Error(`Failed to start Python process: ${err.message}`));
        });
    });
}
