
    // function startProcess() {
    //     loading = true;
    //     // api call to POST localhost:3046/start
    //     // multipart form data
    //     // store result (text) in a variable

import { ViewerState, type ViewerPropertiesStore } from "./viewer/ViewerProperties";

    //     let formData = new FormData();

    //     // image from URL
    //     formData.append("image", imageRaw);

    //     if (transformPoints.length == 4) {
    //         let pointsStr = "";
    //         for (let point of transformPoints) {
    //             // scale point to natural image size

    //             pointsStr += `,${point.x},${point.y}`;
    //         }
    //         pointsStr = pointsStr.slice(1);

    //         formData.append("quad_points", pointsStr);
    //     }

    //     fetch("https://api.jackyoung.xyz/whiteboard/start", {
    //         method: "POST",
    //         body: formData,
    //     })
    //     .then(async (response) => {
    //         //navigate to /whiteboard/s/+page

    //         // store result in a variable
    //         loading = false;
    //         goto(`/whiteboard/s/${await response.text()}`);
    //     });
    // }

export class WhiteboardSession {
    private url: string;
    private sessionId: string | null = null;
    // private authToken: string;

    constructor() {
        this.url = "https://api.jackyoung.xyz/whiteboard";
        // this._authToken = authToken;
    }

    startSession(image: File, points: {x: number, y: number}[]): Promise<string> {
        let formData = new FormData();

        // image from URL
        formData.append("image", image);

        if (points.length == 4) {
            let pointsStr = "";
            for (let point of points) {
                pointsStr += `,${point.x},${point.y}`;
            }
            pointsStr = pointsStr.slice(1);

            formData.append("quad_points", pointsStr);
        }

        return fetch(`${this.url}/start`, {
            method: "POST",
            body: formData,
        })
        .then(async (response) => {
            this.sessionId = await response.text();
            return this.sessionId;
        });
    }

    getPreviewUrl(): string {
        return `${this.url}/s/${this.sessionId}/preview`;
    }

    getPreview(): Promise<string> {
        return fetch(`${this.url}/s/${this.sessionId}/preview`)
        .then(async (response) => {
            return response.text();
        });
    }

    async setOptions(options: {key: string, value: string}[]): Promise<void> {
        let formData = new FormData();
        for (let option of options) {
            formData.append(option.key, option.value);
        }

        await fetch(`${this.url}/s/${this.sessionId}/options`, {
            method: "POST",
            body: formData,
        })

        return;
    }

    getOptions(): Promise<{key: string, value: string}[]> {
        return fetch(`${this.url}/s/${this.sessionId}/options`)
        .then(async (response) => {
            return response.json();
        });
    }

    async process(): Promise<string> {
        let response = await fetch(`${this.url}/s/${this.sessionId}/process`)
        
        // response is an image, save it to the store
        let image = await response.blob();
        return URL.createObjectURL(image);
    }
}