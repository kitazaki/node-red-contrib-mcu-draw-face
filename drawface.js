//drawface.js

import {Node} from "nodered";
import Timer from "timer";
import Poco from "commodetto/Poco";
import {Outline} from "commodetto/outline";

let render, colors, face_current, timerID, timer;

class DrawFaceNode extends Node {
	#face_default

	onStart(config) {
		super.onStart(config);

		this.name = config.name;
		this.#face_default = JSON.parse(config.face);

		render = new Poco(screen);

		const black = render.makeColor(0, 0, 0);
		const white = render.makeColor(255, 255, 255);
		const gray = render.makeColor(127, 127, 127);

		colors = { black, white, gray };

		face_current = deepCopy(this.#face_default);
		applyAutoLayout(face_current);
		drawFace(face_current);

		timer = false;
	}

	onMessage(msg, done) {
		if (msg.payload.cmd != null) {
			let face_temp = deepCopy(face_current);

			switch (msg.payload.cmd) {
				case "default":
					face_current = deepCopy(this.#face_default);
					applyAutoLayout(face_current);
					drawFace(face_current);
					break;

				case "blink":
					applyAutoLayout(face_temp);

					face_temp.eye.right.drawMode = "stroke";
					face_temp.eye.left.drawMode = "stroke";

					face_temp.eye.right.arcEnd = 180;
					face_temp.eye.left.arcEnd = 180;

					face_temp.eye.right.h = Math.round(face_temp.eye.right.w / 2);
					face_temp.eye.left.h = Math.round(face_temp.eye.left.w / 2);

					drawFace(face_temp);

					setTimeout(function () {
						drawFace(face_current);
					}, 300);
					break;

				case "wink":
					applyAutoLayout(face_temp);

					face_temp.eye.right.drawMode = "stroke";
					face_temp.eye.right.arcEnd = 180;
					face_temp.eye.right.h = Math.round(face_temp.eye.right.w / 2);

					drawFace(face_temp);

					setTimeout(function () {
						drawFace(face_current);
					}, 1000);
					break;

				case "smile":
					applyAutoLayout(face_temp);

					face_temp.mouth.shape = "line";
					face_temp.mouth.line.curveStrength = Math.round(getBaseSize(face_temp) * 0.12);

					drawFace(face_temp);

					setTimeout(function () {
						drawFace(face_current);
					}, 1000);
					break;

				case "frown":
					applyAutoLayout(face_temp);

					face_temp.mouth.shape = "line";
					face_temp.mouth.line.curveStrength = -Math.round(getBaseSize(face_temp) * 0.12);

					face_temp.eye.right.w = Math.round(getBaseSize(face_temp) * 0.28);
					face_temp.eye.right.h = Math.round(getBaseSize(face_temp) * 0.18);
					face_temp.eye.right.rotation = -20;
					face_temp.eye.right.arcEnd = 180;
					face_temp.eye.right.lineWidth = Math.max(2, Math.round(getBaseSize(face_temp) * 0.035));
					face_temp.eye.right.drawMode = "stroke";

					face_temp.eye.left.w = Math.round(getBaseSize(face_temp) * 0.28);
					face_temp.eye.left.h = Math.round(getBaseSize(face_temp) * 0.18);
					face_temp.eye.left.rotation = 20;
					face_temp.eye.left.arcEnd = 180;
					face_temp.eye.left.lineWidth = Math.max(2, Math.round(getBaseSize(face_temp) * 0.035));
					face_temp.eye.left.drawMode = "stroke";

					drawFace(face_temp);

					setTimeout(function () {
						drawFace(face_current);
					}, 1000);
					break;

				case "talk":
					if (timer == false) {
						timer = true;

						timerID = Timer.repeat(function () {
							const base = getBaseSize(face_temp);

							applyAutoLayout(face_temp);

							face_temp.mouth.oval.w = Math.round((Math.random() * (base * 0.25)) + (base * 0.06));
							face_temp.mouth.oval.h = Math.round((Math.random() * (base * 0.16)) + (base * 0.06));
							face_temp.mouth.shape = "oval";

							drawFace(face_temp);
						}, 300);
					}
					break;

				case "talk_stop":
					if (timer == true) {
						timer = false;
						Timer.clear(timerID);
						drawFace(face_current);
					}
					break;

				default:
					null;
			}
		}
		else if (msg.payload.face != null) {
			mergeDeep(face_current, msg.payload.face);
			applyAutoLayout(face_current);
			drawFace(face_current);
		}

		msg.payload = {};
		msg.payload.face = face_current;

		return msg;
	}

	static type = "drawface";

	static {
		RED.nodes.registerType(this.type, this);
	}
};

function getAppRotation(face) {
	const rotation = (face.rotation !== undefined) ? face.rotation : 0;

	if (rotation == 90)
		return 90;
	if (rotation == 180)
		return 180;
	if (rotation == 270)
		return 270;

	return 0;
}

function getLogicalWidth(face) {
	const rotation = getAppRotation(face);

	if ((rotation == 90) || (rotation == 270))
		return render.height;

	return render.width;
}

function getLogicalHeight(face) {
	const rotation = getAppRotation(face);

	if ((rotation == 90) || (rotation == 270))
		return render.width;

	return render.height;
}

function getBaseSize(face) {
	return Math.min(Math.min(getLogicalWidth(face), getLogicalHeight(face)), 240);
}

function rotatePoint(face, x, y) {
	const rotation = getAppRotation(face);

	const w = render.width;
	const h = render.height;

	if (rotation == 90) {
		return {
			x: w - y,
			y: x
		};
	}

	if (rotation == 180) {
		return {
			x: w - x,
			y: h - y
		};
	}

	if (rotation == 270) {
		return {
			x: y,
			y: h - x
		};
	}

	return { x, y };
}

function rotateLocalPoint(face, x, y) {
	const rotation = getAppRotation(face);

	if (rotation == 90) {
		return {
			x: -y,
			y: x
		};
	}

	if (rotation == 180) {
		return {
			x: -x,
			y: -y
		};
	}

	if (rotation == 270) {
		return {
			x: y,
			y: -x
		};
	}

	return { x, y };
}

function rotateAngle(face, angle) {
	return angle + getAppRotation(face);
}

function applyAutoLayout(face) {
	const logicalWidth = getLogicalWidth(face);
	const logicalHeight = getLogicalHeight(face);
	const base = getBaseSize(face);

	if (face.eye) {
		face.eye.pupillary_distance = Math.round(Math.min(logicalWidth * 0.34, base * 0.72));
		face.eye.vPos = Math.round(logicalHeight * 0.34);

		if (face.eye.right) {
			face.eye.right.w = Math.round(base * 0.22);
			face.eye.right.h = Math.round(base * 0.22);
			face.eye.right.lineWidth = Math.max(2, Math.round(base * 0.035));
		}

		if (face.eye.left) {
			face.eye.left.w = Math.round(base * 0.22);
			face.eye.left.h = Math.round(base * 0.22);
			face.eye.left.lineWidth = Math.max(2, Math.round(base * 0.035));
		}
	}

	if (face.mouth) {
		face.mouth.vPos = Math.round(logicalHeight * 0.68);

		if (face.mouth.line) {
			face.mouth.line.w = Math.round(base * 0.38);
			face.mouth.line.lineWidth = Math.max(2, Math.round(base * 0.035));
		}

		if (face.mouth.oval) {
			face.mouth.oval.lineWidth = Math.max(2, Math.round(base * 0.035));
		}
	}
}

function drawFace(face) {
	render.begin();

	render.fillRectangle(colors.black, 0, 0, render.width, render.height);

	const logicalWidth = getLogicalWidth(face);

	const eyeRight = face.eye.right;

	if (eyeRight.enable) {
		const x = eyeRight.x;
		const y = eyeRight.y;
		const w = eyeRight.w;
		const h = eyeRight.h;
		const rotation = rotateAngle(face, eyeRight.rotation);
		const arcstart = eyeRight.arcStart;
		const arcend = eyeRight.arcEnd;
		const lineWidth = eyeRight.lineWidth;
		const drawMode = eyeRight.drawMode;

		const rightEyePos = rotatePoint(
			face,
			logicalWidth / 2 - face.eye.pupillary_distance / 2,
			face.eye.vPos
		);

		if (drawMode == "fill") {
			const eye_path_right = new Outline.CanvasPath;

			eye_path_right.ellipse(
				x,
				y,
				w / 2,
				h / 2,
				rotation * Math.PI / 180,
				arcstart * Math.PI / 180,
				arcend * Math.PI / 180
			);

			eye_path_right.closePath();

			const eye = Outline.fill(eye_path_right);

			render.blendOutline(
				colors.white,
				255,
				eye,
				rightEyePos.x,
				rightEyePos.y
			);
		}
		else if (drawMode == "stroke") {
			const eye_path_right = new Outline.CanvasPath;

			eye_path_right.ellipse(
				x,
				y,
				w / 2,
				h / 2,
				rotation * Math.PI / 180,
				arcstart * Math.PI / 180,
				arcend * Math.PI / 180
			);

			eye_path_right.closePath();

			const eye = Outline.stroke(
				eye_path_right,
				lineWidth,
				Outline.LINECAP_ROUND
			);

			render.blendOutline(
				colors.white,
				255,
				eye,
				rightEyePos.x,
				rightEyePos.y
			);
		}
	}

	const eyeLeft = face.eye.left;

	if (eyeLeft.enable) {
		const x = eyeLeft.x;
		const y = eyeLeft.y;
		const w = eyeLeft.w;
		const h = eyeLeft.h;
		const rotation = rotateAngle(face, eyeLeft.rotation);
		const arcstart = eyeLeft.arcStart;
		const arcend = eyeLeft.arcEnd;
		const lineWidth = eyeLeft.lineWidth;
		const drawMode = eyeLeft.drawMode;

		const leftEyePos = rotatePoint(
			face,
			logicalWidth / 2 + face.eye.pupillary_distance / 2,
			face.eye.vPos
		);

		if (drawMode == "fill") {
			const eye_path_left = new Outline.CanvasPath;

			eye_path_left.ellipse(
				x,
				y,
				w / 2,
				h / 2,
				rotation * Math.PI / 180,
				arcstart * Math.PI / 180,
				arcend * Math.PI / 180
			);

			eye_path_left.closePath();

			const eye = Outline.fill(eye_path_left);

			render.blendOutline(
				colors.white,
				255,
				eye,
				leftEyePos.x,
				leftEyePos.y
			);
		}
		else if (drawMode == "stroke") {
			const eye_path_left = new Outline.CanvasPath;

			eye_path_left.ellipse(
				x,
				y,
				w / 2,
				h / 2,
				rotation * Math.PI / 180,
				arcstart * Math.PI / 180,
				arcend * Math.PI / 180
			);

			eye_path_left.closePath();

			const eye = Outline.stroke(
				eye_path_left,
				lineWidth,
				Outline.LINECAP_ROUND
			);

			render.blendOutline(
				colors.white,
				255,
				eye,
				leftEyePos.x,
				leftEyePos.y
			);
		}
	}

	const mouthCenter = face.mouth;

	if (mouthCenter.enable) {
		const mouthPos = rotatePoint(
			face,
			logicalWidth / 2,
			face.mouth.vPos
		);

		if (mouthCenter.shape == "line") {
			const x = mouthCenter.line.x;
			const y = mouthCenter.line.y;
			const w = mouthCenter.line.w;
			const lineWidth = mouthCenter.line.lineWidth;
			const curveStrength = mouthCenter.line.curveStrength;

			const p0 = rotateLocalPoint(face, -w / 2, y);
			const p1 = rotateLocalPoint(face, x, curveStrength);
			const p2 = rotateLocalPoint(face, w / 2, y);

			const mouth_path = new Outline.CanvasPath;

			mouth_path.moveTo(p0.x, p0.y);
			mouth_path.quadraticCurveTo(p1.x, p1.y, p2.x, p2.y);
			mouth_path.closePath();

			const mouth = Outline.stroke(
				mouth_path,
				lineWidth,
				Outline.LINECAP_ROUND
			);

			render.blendOutline(
				colors.white,
				255,
				mouth,
				mouthPos.x,
				mouthPos.y
			);
		}
		else if (mouthCenter.shape == "oval") {
			const x = mouthCenter.oval.x;
			const y = mouthCenter.oval.y;
			const w = mouthCenter.oval.w;
			const h = mouthCenter.oval.h;
			const rotation = rotateAngle(face, mouthCenter.oval.rotation);
			const arcStart = mouthCenter.oval.arcStart;
			const arcEnd = mouthCenter.oval.arcEnd;
			const drawMode = mouthCenter.oval.drawMode;
			const lineWidth = mouthCenter.oval.lineWidth;

			const center = rotateLocalPoint(face, x, y);

			const mouth_path = new Outline.CanvasPath;

			mouth_path.ellipse(
				center.x,
				center.y,
				w / 2,
				h / 2,
				rotation * Math.PI / 180,
				arcStart * Math.PI / 180,
				arcEnd * Math.PI / 180
			);

			mouth_path.closePath();

			if (drawMode == "fill") {
				const mouth = Outline.fill(mouth_path);

				render.blendOutline(
					colors.white,
					255,
					mouth,
					mouthPos.x,
					mouthPos.y
				);
			}
			else if (drawMode == "stroke") {
				const mouth = Outline.stroke(
					mouth_path,
					lineWidth,
					Outline.LINECAP_ROUND
				);

				render.blendOutline(
					colors.white,
					255,
					mouth,
					mouthPos.x,
					mouthPos.y
				);
			}
		}
	}

	render.end();
};

function mergeDeep(target, source) {
	for (let key in source) {
		if (source[key] instanceof Object && key in target) {
			target[key] = mergeDeep(target[key], source[key]);
		}
		else {
			target[key] = source[key];
		}
	}

	return target;
};

function deepCopy(obj) {
	if (obj === null || typeof obj !== "object") {
		return obj;
	}

	const objCopy = {};

	for (let key in obj) {
		if (obj.hasOwnProperty(key)) {
			objCopy[key] = deepCopy(obj[key]);
		}
	}

	return objCopy;
};
