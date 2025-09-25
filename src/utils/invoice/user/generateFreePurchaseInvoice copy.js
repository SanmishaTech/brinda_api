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
  const date = new Date(dateString);
  return `${String(date.getDate()).padStart(2, "0")}/${String(
    date.getMonth() + 1
  ).padStart(2, "0")}/${date.getFullYear()}`;
};

const generateFreePurchaseInvoice = async (invoiceData, filePath) => {
  const dirname = path.dirname(filePath);
  if (!fs.existsSync(dirname)) {
    fs.mkdirSync(dirname, { recursive: true });
  }

  const { invoiceNumber, invoiceDate, member, memberDetails, items } =
    invoiceData;

  const itemTableBody = [
    [
      { text: "Sr No.", style: "tableHeader" },
      { text: "Product Name", style: "tableHeader" },
      { text: "Quantity", style: "tableHeader" },
      { text: "Amount", style: "tableHeader" },
    ],
    ...items.map((item, index) => [
      { text: index + 1, style: "tableCell" },
      { text: item.description || "N/A", style: "tableCell" },
      { text: item.quantity?.toString() || "0", style: "tableCell" },
      { text: "Free", style: "tableCell" },
    ]),
  ];

  const docDefinition = {
    pageSize: "A4",
    pageMargins: [40, 60, 40, 60],
    content: [
      { text: "Free Product Invoice", style: "header" },
      {
        columns: [
          {
            width: "50%",
            stack: [
              { text: member?.memberName || "", style: "subheader" },
              {
                text: member?.addressLines?.join("\n") || "",
                style: "normalText",
              },
              {
                text: member?.pincode ? `Pincode: ${member.pincode}` : "",
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
              memberDetails.logoPath && fs.existsSync(memberDetails.logoPath)
                ? {
                    image: memberDetails.logoPath,
                    width: 100,
                    alignment: "right",
                  }
                : null,
              { text: memberDetails.name, style: "companyName" },
              {
                text: memberDetails.addressLines.join("\n"),
                style: "normalTextRight",
              },
              {
                text: `GSTIN: ${memberDetails.gstin}`,
                style: "normalTextRight",
              },
              {
                text: `Email: ${memberDetails.email}`,
                style: "normalTextRight",
              },
            ].filter(Boolean),
          },
        ],
        margin: [0, 0, 0, 20],
      },

      {
        table: {
          headerRows: 1,
          widths: ["auto", "*", "auto", "auto"],
          body: itemTableBody,
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
        },
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
    ],
    styles: {
      header: {
        fontSize: 18,
        bold: true,
        alignment: "center",
        margin: [0, 0, 0, 20],
      },
      subheader: { fontSize: 12, bold: true },
      companyName: { fontSize: 14, bold: true, alignment: "right" },
      normalText: { fontSize: 9 },
      normalTextRight: { fontSize: 9, alignment: "right" },
      boldText: { fontSize: 9, bold: true },
      tableHeader: {
        bold: true,
        fontSize: 9,
        fillColor: "#f2f2f2",
        alignment: "center",
      },
      tableCell: { fontSize: 9, alignment: "center" },
      signatureText: { fontSize: 10, bold: true },
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

module.exports = { generateFreePurchaseInvoice };
