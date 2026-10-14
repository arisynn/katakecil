import { i as __toESM } from "../_runtime.mjs";
import { K as require_react, b as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-DQ44k2nZ.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var COVER_MAX_EDGE = 8e3;
var COVER_LONG_EDGE = 1600;
/** Rak KataKecil is a 2:3 frame (height / width). */
var SHELF_RATIO = 1.5;
var NAMED_RATIOS = [
	[
		9,
		16,
		"9:16"
	],
	[
		9,
		19.5,
		"9:19.5"
	],
	[
		9,
		21,
		"9:21"
	],
	[
		2,
		3,
		"2:3"
	],
	[
		3,
		4,
		"3:4"
	],
	[
		1,
		1,
		"1:1"
	],
	[
		16,
		9,
		"16:9"
	],
	[
		3,
		2,
		"3:2"
	],
	[
		4,
		3,
		"4:3"
	],
	[
		21,
		9,
		"21:9"
	]
];
function nearestRatioName(width, height) {
	const ratio = height / width;
	let best = "";
	let bestDelta = .055;
	for (const [w, h, name] of NAMED_RATIOS) {
		const delta = Math.abs(ratio - h / w);
		if (delta < bestDelta) {
			bestDelta = delta;
			best = name;
		}
	}
	return best || `${ratio.toFixed(2)}×`;
}
function shelfNeedsFill(ratio) {
	return Math.abs(ratio - SHELF_RATIO) > .06;
}
function defaultFocus(kind) {
	if (kind === "wallpaper" || kind === "poster") return {
		x: .5,
		y: .38
	};
	if (kind === "wide") return {
		x: .5,
		y: .42
	};
	return {
		x: .5,
		y: .5
	};
}
function describe(ratio) {
	if (ratio >= 2.35) return {
		kind: "poster",
		label: "Poster panjang",
		hint: "Di rak gambar tetap utuh, ruang kosong diisi blur. Di detail sampul bisa digeser."
	};
	if (ratio >= 1.6) return {
		kind: "wallpaper",
		label: "Wallpaper HP",
		hint: "Tidak dipotong jadi 2:3. Rak menampilkan gambar utuh dengan latar blur."
	};
	if (ratio >= 1.25) {
		const near34 = Math.abs(ratio - 4 / 3);
		const near23 = Math.abs(ratio - SHELF_RATIO);
		if (near34 <= near23 && near34 <= .08) return {
			kind: "book",
			label: "Sampul 3:4",
			hint: "Sedikit lebih lebar dari rak 2:3. Gambar tidak dipotong; sisi atas dan bawah diisi blur."
		};
		if (near23 <= .08) return {
			kind: "book",
			label: "Sampul 2:3",
			hint: "Pas dengan rak. Gambar mengisi bingkai tanpa blur."
		};
		return {
			kind: "book",
			label: "Sampul buku",
			hint: "Dekat dengan sampul buku. Rak menjaga gambar utuh."
		};
	}
	if (ratio >= .85) return {
		kind: "square",
		label: "Hampir kotak",
		hint: "Tidak ditarik jadi potret. Rak mengisi ruang kosong dengan blur."
	};
	return {
		kind: "wide",
		label: "Sampul lebar",
		hint: "Gambar lebar tetap utuh. Tidak dipotong di kiri dan kanan."
	};
}
function classifyCover(width, height) {
	if (!(width > 0) || !(height > 0) || !Number.isFinite(width) || !Number.isFinite(height)) return null;
	const ratio = height / width;
	return {
		width,
		height,
		ratio,
		ratioName: nearestRatioName(width, height),
		...describe(ratio)
	};
}
function coverProblem(width, height) {
	if (!(width > 0) || !(height > 0)) return "Gambar tidak bisa dibaca.";
	const shortEdge = Math.min(width, height);
	const longEdge = Math.max(width, height);
	if (shortEdge < 200) return `Sisi terpendek ${Math.round(shortEdge)} px. Minimal 200 px supaya tidak pecah di HP.`;
	if (longEdge > 8e3) return `Sisi terpanjang ${Math.round(longEdge)} px. Maksimal ${COVER_MAX_EDGE} px.`;
	const ratio = height / width;
	if (ratio > 4 || ratio < 1 / 4) return "Rasio terlalu ekstrem. 9:16, 3:4, 2:3, kotak, dan sampul lebar biasa masih diterima.";
	return null;
}
function isHeic(file) {
	return /heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);
}
function acceptedType(type) {
	return type === "image/jpeg" || type === "image/png" || type === "image/webp";
}
function formatBytes(bytes) {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
	return `${(bytes / 1048576).toFixed(1)} MB`;
}
function canvasBlob(canvas, type, quality) {
	return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), type, quality));
}
async function encodeCover(canvas) {
	const qualities = [
		.82,
		.7,
		.58
	];
	let last = null;
	for (const quality of qualities) {
		const blob = await canvasBlob(canvas, "image/webp", quality);
		if (!blob) break;
		last = blob;
		if (blob.size <= 5242880) return blob;
	}
	if (!last) last = await canvasBlob(canvas, "image/jpeg", .82);
	return last;
}
async function prepareCoverFile(file) {
	if (isHeic(file)) return { error: "Foto HEIC dari iPhone belum didukung. Simpan sebagai JPG, lalu unggah lagi." };
	if (!acceptedType(file.type)) return { error: "Gunakan gambar JPG, PNG, atau WebP." };
	if (file.size > 20971520) return { error: "Sampul terlalu besar untuk dibaca. Pakai gambar di bawah 20 MB." };
	let bitmap;
	try {
		bitmap = await createImageBitmap(file);
	} catch {
		return { error: "Gambar tidak bisa dibaca. Coba file lain." };
	}
	const problem = coverProblem(bitmap.width, bitmap.height);
	if (problem) {
		bitmap.close();
		return { error: problem };
	}
	const measure = classifyCover(bitmap.width, bitmap.height);
	if (!measure) {
		bitmap.close();
		return { error: "Gambar tidak bisa dibaca." };
	}
	let encoded = null;
	const edges = [
		COVER_LONG_EDGE,
		1280,
		960
	];
	for (const edge of edges) {
		const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height));
		const width = Math.max(1, Math.round(bitmap.width * scale));
		const height = Math.max(1, Math.round(bitmap.height * scale));
		const canvas = document.createElement("canvas");
		canvas.width = width;
		canvas.height = height;
		const ctx = canvas.getContext("2d");
		if (!ctx) continue;
		ctx.drawImage(bitmap, 0, 0, width, height);
		encoded = await encodeCover(canvas);
		if (encoded && encoded.size <= 5242880) break;
	}
	bitmap.close();
	if (!encoded) return { error: "Gagal mengompres sampul." };
	if (encoded.size > 5242880) return { error: "Setelah dikecilkan, sampul masih di atas 5 MB. Pakai gambar yang lebih sederhana." };
	return {
		blob: encoded,
		measure,
		previewUrl: URL.createObjectURL(encoded),
		beforeBytes: file.size
	};
}
function SmartCover({ src, title, surface, known }) {
	const [measure, setMeasure] = (0, import_react.useState)(known ?? null);
	(0, import_react.useEffect)(() => {
		setMeasure(known ?? null);
	}, [known, src]);
	const kind = measure?.kind ?? "book";
	const fill = surface !== "detail" && measure ? shelfNeedsFill(measure.ratio) : false;
	const focus = measure ? defaultFocus(measure.kind) : {
		x: .5,
		y: .5
	};
	const detailRatio = measure && kind !== "poster" ? `${measure.width} / ${measure.height}` : void 0;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: `frame frame-${surface} ${fill ? "frame-fill-yes" : "frame-fill-no"}`,
		"data-kind": kind,
		style: surface === "detail" && detailRatio ? { aspectRatio: detailRatio } : void 0,
		children: [fill && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
			src,
			alt: "",
			"aria-hidden": "true",
			className: "frame-backdrop"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
			src,
			alt: surface === "detail" ? `Sampul ${title}` : "",
			className: "frame-image",
			style: { objectPosition: `${focus.x * 100}% ${focus.y * 100}%` },
			onLoad: (event) => {
				if (known) return;
				const img = event.currentTarget;
				setMeasure(classifyCover(img.naturalWidth, img.naturalHeight));
			}
		})]
	});
}
var STORIES = [
	[
		"senja",
		"Senja di Ujung Kota",
		"Romansa",
		"Dua hati yang selalu bertemu di waktu yang salah, di atap kota yang belum tidur.",
		"/covers/senja.jpg",
		1008,
		1792
	],
	[
		"langit",
		"Langit yang Sama",
		"Romansa",
		"Satu langit, dua perjalanan, dan hal kecil yang membuat seseorang kembali.",
		"/covers/langit.jpg",
		1200,
		1600
	],
	[
		"jejak",
		"Jejak di Kertas",
		"Slice of Life",
		"Di antara halaman dan ingatan, ada cerita yang belum selesai ditulis.",
		"/covers/jejak.jpg",
		1152,
		1728
	],
	[
		"rumah",
		"Rumah Kedua",
		"Keluarga",
		"Pulang tidak selalu berarti kembali ke tempat yang sama.",
		"/covers/rumah.jpg",
		1792,
		1008
	],
	[
		"hujan",
		"Sebelum Hujan",
		"Romansa",
		"Ketika langit berubah warna, ada janji yang masih menunggu.",
		"/covers/hujan.jpg",
		1408,
		1408
	],
	[
		"bunga",
		"Bunga Terakhir",
		"Fantasi",
		"Di taman yang terlupakan, satu bunga menyimpan harapan yang panjang.",
		"/covers/bunga.jpg",
		1008,
		2741
	]
].map(([id, title, genre, synopsis, src, w, h]) => ({
	id,
	title,
	genre,
	synopsis,
	src,
	measure: classifyCover(w, h)
}));
function Mark() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		viewBox: "0 0 128 128",
		"aria-hidden": "true",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("defs", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("linearGradient", {
				id: "feather",
				x1: "0",
				y1: "0",
				x2: "1",
				y2: "1",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", { stopColor: "#C7E5FF" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
						offset: ".48",
						stopColor: "#79B9F8"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
						offset: "1",
						stopColor: "#235DB4"
					})
				]
			}) }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				d: "M107 16C76 14 42 28 29 59c-7 16-5 30 2 39 18 5 39-4 53-22 15-19 23-41 23-60Z",
				fill: "url(#feather)"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				d: "M20 114C36 81 59 54 96 28",
				stroke: "#D9F0FF",
				strokeWidth: "5.5",
				fill: "none",
				strokeLinecap: "round"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				d: "m43 82-11-11m24-8-11-14m26 2-7-17m17 7 13-13",
				fill: "none",
				stroke: "#F5FBFF",
				strokeWidth: "2.6",
				strokeLinecap: "round",
				opacity: ".85"
			})
		]
	});
}
function LibraryPreview() {
	const [theme, setTheme] = (0, import_react.useState)("dark");
	const [ready, setReady] = (0, import_react.useState)(false);
	const [tab, setTab] = (0, import_react.useState)("rak");
	const [open, setOpen] = (0, import_react.useState)(null);
	const [prepared, setPrepared] = (0, import_react.useState)(null);
	const [sampleId, setSampleId] = (0, import_react.useState)("senja");
	const [error, setError] = (0, import_react.useState)("");
	const [busy, setBusy] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		const stored = localStorage.getItem("appThemePreference");
		const next = stored === "light" || stored === "dark" ? stored : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
		setTheme(next);
		setReady(true);
	}, []);
	(0, import_react.useEffect)(() => {
		if (!ready) return;
		document.documentElement.setAttribute("data-app-theme", theme);
		localStorage.setItem("appThemePreference", theme);
	}, [theme, ready]);
	const story = STORIES.find((item) => item.id === open) ?? null;
	const sample = STORIES.find((item) => item.id === sampleId) ?? null;
	const active = (0, import_react.useMemo)(() => {
		if (prepared) return {
			src: prepared.previewUrl,
			measure: prepared.measure,
			title: "Sampul baru"
		};
		if (sample) return {
			src: sample.src,
			measure: sample.measure,
			title: sample.title
		};
		return null;
	}, [prepared, sample]);
	async function onFile(file) {
		setError("");
		if (!file) return;
		setBusy(true);
		const result = await prepareCoverFile(file);
		setBusy(false);
		if ("error" in result) {
			setPrepared(null);
			setError(result.error);
			return;
		}
		setPrepared((prev) => {
			if (prev) URL.revokeObjectURL(prev.previewUrl);
			return result;
		});
		setSampleId(null);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "app-shell",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "app-top",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "brand",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mark, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "KataKecil" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "SAMPUL PINTAR" })] })]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "icon-btn",
					"aria-label": theme === "dark" ? "Tema terang" : "Tema gelap",
					onClick: () => setTheme((value) => value === "dark" ? "light" : "dark"),
					children: theme === "dark" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
						width: "18",
						height: "18",
						viewBox: "0 0 24 24",
						fill: "none",
						stroke: "currentColor",
						strokeWidth: "1.8",
						"aria-hidden": "true",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
							cx: "12",
							cy: "12",
							r: "4"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
							d: "M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4",
							strokeLinecap: "round"
						})]
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", {
						width: "18",
						height: "18",
						viewBox: "0 0 24 24",
						fill: "none",
						stroke: "currentColor",
						strokeWidth: "1.8",
						"aria-hidden": "true",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
							d: "M16 3.2A8.5 8.5 0 1 0 20.8 13 7 7 0 0 1 16 3.2Z",
							strokeLinejoin: "round"
						})
					})
				})]
			}),
			story ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "back",
					onClick: () => setOpen(null),
					children: "← Rak"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SmartCover, {
					src: story.src,
					title: story.title,
					surface: "detail",
					known: story.measure
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "detail-copy",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: story.title }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "chips",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "chip",
									children: story.genre
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "chip",
									children: story.measure.ratioName
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "chip",
									children: story.measure.label
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: story.synopsis }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "note",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Di halaman detail" }),
								story.measure.hint,
								story.measure.kind === "poster" ? " Geser gambarnya ke bawah." : ""
							]
						})
					]
				})
			] }) : tab === "rak" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "kicker",
					children: "CERITA KECIL, MAKNA BESAR"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "hero-title",
					children: "Rak yang tidak memotong sampul."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "lede",
					children: "Wallpaper 9:16, sampul 3:4, poster panjang, dan gambar lebar tetap utuh. Bingkai rak tetap sejajar."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "shelf",
					children: STORIES.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("article", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						className: "story-open",
						onClick: () => setOpen(item.id),
						"aria-label": `Lihat ${item.title}`,
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SmartCover, {
								src: item.src,
								title: item.title,
								surface: "shelf",
								known: item.measure
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "story-title",
								children: item.title
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "story-meta",
								children: [
									item.measure.ratioName,
									" · ",
									item.measure.label
								]
							})
						]
					}) }, item.id))
				})
			] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "studio-lead",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "kicker",
						children: "STUDIO"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "hero-title",
						children: "Unggah, lalu lihat tiga tempat."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "lede",
						children: "JPG, PNG, atau WebP. Gambar dikecilkan ke WebP sebelum naik, paling panjang 1600 px, maksimal 5 MB."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "picker",
						children: [busy ? "Membaca gambar…" : "Pilih sampul dari HP", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "file",
							accept: "image/png,image/jpeg,image/webp,image/heic,image/heif,.heic,.heif",
							onChange: (event) => {
								const file = event.target.files?.[0] ?? null;
								event.target.value = "";
								onFile(file);
							}
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "examples",
						"aria-label": "Contoh rasio",
						children: STORIES.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							className: `example ${sampleId === item.id && !prepared ? "is-on" : ""}`,
							onClick: () => {
								setError("");
								setPrepared((prev) => {
									if (prev) URL.revokeObjectURL(prev.previewUrl);
									return null;
								});
								setSampleId(item.id);
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SmartCover, {
								src: item.src,
								title: item.title,
								surface: "thumb",
								known: item.measure
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: item.measure.label })]
						}, item.id))
					}),
					error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "alert",
						role: "alert",
						children: error
					}),
					active && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "measure",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("b", { children: [
								active.measure.ratioName,
								" · ",
								active.measure.label
							] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
								active.measure.width,
								"×",
								active.measure.height
							] })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "lede",
							style: { marginTop: 10 },
							children: active.measure.hint
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mocks",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("figure", {
									className: "mock",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SmartCover, {
										src: active.src,
										title: active.title,
										surface: "shelf",
										known: active.measure
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("figcaption", { children: "Rak" })]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("figure", {
									className: "mock mock-detail",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SmartCover, {
										src: active.src,
										title: active.title,
										surface: "detail",
										known: active.measure
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("figcaption", { children: "Detail" })]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("figure", {
									className: "mock",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SmartCover, {
										src: active.src,
										title: active.title,
										surface: "thumb",
										known: active.measure
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("figcaption", { children: "Daftar" })]
								})
							]
						}),
						prepared && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "sizes",
							children: [
								"File asli ",
								formatBytes(prepared.beforeBytes),
								" menjadi ",
								formatBytes(prepared.blob.size),
								" WebP. Yang naik nanti adalah gambar utuh, bukan potongan."
							]
						})
					] })
				]
			}),
			!story && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("nav", {
				className: "tabbar",
				"aria-label": "Bagian",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: tab === "rak" ? "is-on" : "",
					onClick: () => setTab("rak"),
					children: "Rak"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: tab === "studio" ? "is-on" : "",
					onClick: () => setTab("studio"),
					children: "Studio"
				})]
			})
		]
	});
}
var SplitComponent = LibraryPreview;
//#endregion
export { SplitComponent as component };
