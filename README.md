# Sudoku Solver

A browser-based sudoku solver with image recognition. Enter a puzzle manually or upload a photo of a printed grid and it will extract the digits automatically.

**Live demo:** https://jennifer-liu-zx.github.io/sudoku-solver

## Features

- Solve any valid sudoku puzzle
- Upload an image of a printed grid — digits are detected automatically using OpenCV.js and Tesseract.js
- Preview detected digits before confirming
- Keyboard navigation between cells

## How to use

**Manual input**
Type digits 1–9 into the grid cells, then click **Solve**. Use arrow keys to move between cells.

**Image upload**
Click **Upload Image** and select a photo or screenshot of a sudoku grid. The detected digits will appear as an overlay — click **Confirm** to load them into the grid, then **Solve**.

## Technologies

- Vanilla JS, HTML, CSS
- [OpenCV.js](https://docs.opencv.org/4.x/opencv.js) — grid detection and perspective correction
- [Tesseract.js](https://tesseract.projectnaptha.com/) — digit recognition
