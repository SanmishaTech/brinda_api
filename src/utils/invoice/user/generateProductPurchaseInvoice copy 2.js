const PdfPrinter = require("pdfmake");
const fs = require("fs");
const path = require("path");

const vfsCandidate = require("pdfmake/build/vfs_fonts.js");
let vfsData =
  vfsCandidate?.pdfMake?.vfs || vfsCandidate?.vfs || vfsCandidate || {};
const fonts = {
  Roboto: {
    normal: vfsData["Roboto-Regular.ttf"]
      ? Buffer.from(vfsData["Roboto-Regular.ttf"], "base64")
      : null,
    bold: vfsData["Roboto-Medium.ttf"]
      ? Buffer.from(vfsData["Roboto-Medium.ttf"], "base64")
      : null,
    italics: vfsData["Roboto-Italic.ttf"]
      ? Buffer.from(vfsData["Roboto-Italic.ttf"], "base64")
      : null,
    bolditalics: vfsData["Roboto-MediumItalic.ttf"]
      ? Buffer.from(vfsData["Roboto-MediumItalic.ttf"], "base64")
      : null,
  },
};

Object.keys(fonts.Roboto).forEach((key) => {
  if (!fonts.Roboto[key]) delete fonts.Roboto[key];
});

const printer = new PdfPrinter(fonts);

const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return `${String(date.getDate()).padStart(2, "0")}/${String(
    date.getMonth() + 1
  ).padStart(2, "0")}/${date.getFullYear()}`;
};

const safeFixed = (value) => {
  const num = Number(value);
  return isNaN(num) ? "0.00" : num.toFixed(2);
};

const generateProductPurchaseInvoice = async (invoiceData, filePath) => {
  const dirname = path.dirname(filePath);
  if (!fs.existsSync(dirname)) {
    fs.mkdirSync(dirname, { recursive: true });
  }

  const { invoiceNumber, invoiceDate, member, memberDetails, items, totals } =
    invoiceData;
  const companyDetails = memberDetails;

  const itemTableBody = [
    [
      { text: "Sr No.", style: "tableHeader" },
      { text: "Description", style: "tableHeader" },
      { text: "Qty", style: "tableHeader" },
      { text: "Rate", style: "tableHeader" },
      { text: "Amount", style: "tableHeader" },
      { text: "CGST %", style: "tableHeader" },
      { text: "SGST %", style: "tableHeader" },
      { text: "IGST %", style: "tableHeader" },
      { text: "Total", style: "tableHeader" },
    ],
    ...items.map((item) => [
      { text: item.srNo, style: "tableCell" },
      { text: item.description, style: "tableCell" },
      { text: item.quantity?.toString() || "N/A", style: "tableCell" },
      { text: safeFixed(item.rate), style: "tableCell" },
      { text: safeFixed(item.amountWithoutGst), style: "tableCell" },
      { text: safeFixed(item.cgstPercent), style: "tableCell" },
      { text: safeFixed(item.sgstPercent), style: "tableCell" },
      { text: safeFixed(item.igstPercent), style: "tableCell" },
      { text: safeFixed(item.amountWithGst), style: "tableCell" },
    ]),
    [
      {
        text: "Total Amount (Without GST)",
        colSpan: 8,
        alignment: "right",
        style: "tableTotalsLabelBold",
      },
      {},
      {},
      {},
      {},
      {},
      { text: "", colSpan: 2 },
      {},
      {
        text: safeFixed(totals.totalAmountWithoutGst),
        style: "tableCell",
      },
    ],
    [
      {
        text: "Total GST Amount",
        colSpan: 8,
        alignment: "right",
        style: "tableTotalsLabelBold",
      },
      {},
      {},
      {},
      {},
      {},
      { text: "", colSpan: 2 },
      {},
      {
        text: safeFixed(totals.totalGstAmount),
        style: "tableCell",
      },
    ],
    [
      {
        text: "Total Amount (With GST)",
        colSpan: 8,
        alignment: "right",
        style: "tableTotalsLabelBold",
      },
      {},
      {},
      {},
      {},
      {},
      { text: "", colSpan: 2 },
      {},
      {
        text: safeFixed(totals.totalAmountWithGst),
        style: "tableCell",
      },
    ],
  ];

  const docDefinition = {
    pageSize: "A4",
    pageMargins: [40, 60, 40, 60],
    content: [
      {
        columns: [
          {
            width: "50%",
            stack: [
              { text: member.memberName, style: "subheader" },
              {
                text: member.addressLines?.join("\n") || "",
                style: "normalText",
              },
              {
                text: member.pincode ? `Pincode: ${member.pincode}` : "",
                style: "normalText",
              },
              {
                margin: [0, 10, 0, 10],
                table: {
                  widths: ["auto", "*"],
                  body: [
                    [
                      {
                        text: "Invoice No.:",
                        style: "boldText",
                        border: [false, false, false, false],
                      },
                      {
                        text: invoiceNumber,
                        style: "normalText",
                        border: [false, false, false, false],
                      },
                    ],
                    [
                      {
                        text: "Invoice Date:",
                        style: "boldText",
                        border: [false, false, false, false],
                      },
                      {
                        text: formatDate(invoiceDate),
                        style: "normalText",
                        border: [false, false, false, false],
                      },
                    ],
                  ],
                },
                layout: "noBorders",
              },
            ],
          },
          {
            width: "50%",
            alignment: "right",
            stack: [
              companyDetails.logoPath && fs.existsSync(companyDetails.logoPath)
                ? {
                    image: companyDetails.logoPath,
                    width: 120,
                    alignment: "right",
                    margin: [0, 0, 0, 10],
                  }
                : { text: "", margin: [0, 0, 0, 10] },
              { text: companyDetails.name, style: "companyName" },
              {
                text: companyDetails.addressLines.join("\n"),
                style: "normalTextRight",
              },
              {
                text: `GSTIN: ${companyDetails.gstin}`,
                style: "normalTextRight",
              },
              {
                text: `Email: ${companyDetails.email}`,
                style: "normalTextRight",
              },
            ],
          },
        ],
        columnGap: 20,
        margin: [0, 0, 0, 20],
      },

      { text: "Tax Invoice", style: "header" },

      {
        table: {
          headerRows: 1,
          widths: [
            "auto",
            "*",
            "auto",
            "auto",
            "auto",
            "auto",
            "auto",
            "auto",
            "auto",
          ],
          body: itemTableBody,
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
        },
        margin: [0, 0, 0, 20],
      },

      {
        text: `Amount in Words: ${totals.amountInWords}`,
        style: "normalText",
        margin: [0, 0, 0, 20],
      },

      {
        columns: [
          { text: "", width: "*" },
          {
            width: "auto",
            stack: [
              {
                text: `For ${member.memberName}`,
                style: "signatureText",
                alignment: "right",
              },
              { text: "\n\n\n", style: "normalText" },
              {
                text: "Authorised Signatory",
                style: "signatureText",
                alignment: "right",
              },
            ],
            margin: [0, 20, 0, 20],
          },
        ],
      },

      {
        text: "Thank you for your business!",
        style: "thankYouText",
        alignment: "center",
        margin: [0, 0, 0, 20],
      },
    ],
    styles: {
      header: {
        fontSize: 18,
        bold: true,
        alignment: "center",
        margin: [0, 0, 0, 20],
      },
      subheader: { fontSize: 12, bold: true, margin: [0, 0, 0, 2] },
      companyName: {
        fontSize: 14,
        bold: true,
        alignment: "right",
        margin: [0, 0, 0, 5],
      },
      normalText: { fontSize: 9, margin: [0, 1, 0, 1] },
      normalTextRight: {
        fontSize: 9,
        alignment: "right",
        margin: [0, 1, 0, 1],
      },
      boldText: { fontSize: 9, bold: true },
      tableHeader: {
        bold: true,
        fontSize: 9,
        fillColor: "#f2f2f2",
        alignment: "center",
      },
      tableCell: { fontSize: 9, alignment: "center" },
      tableTotalsLabelBold: { fontSize: 9, bold: true, alignment: "right" },
      signatureText: { fontSize: 10, bold: true },
      thankYouText: { fontSize: 9, italics: true, color: "gray" },
    },
    defaultStyle: {
      font: "Roboto",
    },
  };

  const pdfDoc = printer.createPdfKitDocument(docDefinition);
  return new Promise((resolve, reject) => {
    const stream = fs.createWriteStream(filePath);
    pdfDoc.pipe(stream);
    pdfDoc.end();
    stream.on("finish", resolve);
    stream.on("error", reject);
  });
};

module.exports = { generateProductPurchaseInvoice };
