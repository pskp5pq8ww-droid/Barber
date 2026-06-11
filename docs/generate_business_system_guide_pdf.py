from html.parser import HTMLParser
from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    ListFlowable,
    ListItem,
    PageBreak,
    Paragraph,
    Preformatted,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parent
HTML_PATH = ROOT / "guia-codigo-sistemas-empresariales.html"
PDF_PATH = ROOT / "guia-codigo-sistemas-empresariales.pdf"


class GuideParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.blocks = []
        self.skip_depth = 0
        self.current_tag = None
        self.current_text = []
        self.current_list = None
        self.current_table = None
        self.current_row = None
        self.current_cell = None
        self.in_code = False

    def handle_starttag(self, tag, attrs):
        if tag in {"head", "style", "script"}:
            self.skip_depth += 1
            return
        if self.skip_depth:
            return
        if tag in {"h1", "h2", "h3", "p", "li", "pre"}:
            self.current_tag = tag
            self.current_text = []
        elif tag in {"ol", "ul"}:
            self.current_list = {"type": tag, "items": []}
        elif tag == "table":
            self.current_table = []
        elif tag == "tr":
            self.current_row = []
        elif tag in {"th", "td"}:
            self.current_cell = []
        elif tag == "br":
            self._append_text("\n")
        elif tag == "code":
            self.in_code = True

    def handle_endtag(self, tag):
        if tag in {"head", "style", "script"} and self.skip_depth:
            self.skip_depth -= 1
            return
        if self.skip_depth:
            return
        if tag == "code":
            self.in_code = False
            return
        if tag in {"h1", "h2", "h3", "p", "li", "pre"} and self.current_tag == tag:
            text = " ".join("".join(self.current_text).split()) if tag != "pre" else "".join(self.current_text).strip()
            if text:
                if tag == "li" and self.current_list is not None:
                    self.current_list["items"].append(text)
                else:
                    self.blocks.append((tag, text))
            self.current_tag = None
            self.current_text = []
        elif tag in {"ol", "ul"} and self.current_list is not None:
            if self.current_list["items"]:
                self.blocks.append(("list", self.current_list))
            self.current_list = None
        elif tag in {"th", "td"} and self.current_cell is not None:
            text = " ".join("".join(self.current_cell).split())
            if self.current_row is not None:
                self.current_row.append(text)
            self.current_cell = None
        elif tag == "tr" and self.current_row is not None:
            if any(cell for cell in self.current_row):
                self.current_table.append(self.current_row)
            self.current_row = None
        elif tag == "table" and self.current_table is not None:
            if self.current_table:
                self.blocks.append(("table", self.current_table))
            self.current_table = None

    def handle_data(self, data):
        if self.skip_depth:
            return
        self._append_text(data)

    def _append_text(self, data):
        if self.current_cell is not None:
            self.current_cell.append(data)
        elif self.current_tag is not None:
            self.current_text.append(data)


def build_pdf():
    parser = GuideParser()
    parser.feed(HTML_PATH.read_text(encoding="utf-8"))

    styles = getSampleStyleSheet()
    title = ParagraphStyle(
        "GuideTitle",
        parent=styles["Title"],
        fontName="Helvetica-Bold",
        fontSize=28,
        leading=33,
        textColor=colors.HexColor("#101820"),
        alignment=TA_CENTER,
        spaceAfter=12,
    )
    subtitle = ParagraphStyle(
        "GuideSubtitle",
        parent=styles["BodyText"],
        fontSize=12,
        leading=17,
        textColor=colors.HexColor("#35444d"),
        alignment=TA_CENTER,
        spaceAfter=18,
    )
    h2 = ParagraphStyle(
        "GuideH2",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=17,
        leading=21,
        textColor=colors.HexColor("#101820"),
        spaceBefore=16,
        spaceAfter=8,
    )
    h3 = ParagraphStyle(
        "GuideH3",
        parent=styles["Heading3"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=15,
        textColor=colors.HexColor("#1d3039"),
        spaceBefore=10,
        spaceAfter=5,
    )
    body = ParagraphStyle(
        "GuideBody",
        parent=styles["BodyText"],
        fontSize=9.7,
        leading=14,
        textColor=colors.HexColor("#1d252c"),
        spaceAfter=6,
    )
    bullet = ParagraphStyle(
        "GuideBullet",
        parent=body,
        leftIndent=8,
        firstLineIndent=0,
        spaceAfter=4,
    )
    pre_style = ParagraphStyle(
        "GuidePre",
        parent=styles["Code"],
        fontName="Courier",
        fontSize=7.8,
        leading=10,
        textColor=colors.HexColor("#101820"),
        backColor=colors.HexColor("#edf1f4"),
        borderPadding=7,
        spaceBefore=6,
        spaceAfter=8,
    )
    cell_style = ParagraphStyle(
        "GuideCell",
        parent=body,
        fontSize=7.5,
        leading=9.2,
        spaceAfter=0,
    )
    head_cell_style = ParagraphStyle(
        "GuideHeadCell",
        parent=cell_style,
        fontName="Helvetica-Bold",
        textColor=colors.HexColor("#101820"),
    )

    story = [
        Spacer(1, 60 * mm),
        Paragraph("Guia de Codigo para Sistemas Empresariales Modulares", title),
        Paragraph(
            "Arquitectura, seguridad, despliegue en Hostinger, modulos funcionales y mejoras "
            "para construir aplicaciones operativas para pequenas y medianas empresas.",
            subtitle,
        ),
        Paragraph("Generado el 11 de junio de 2026", subtitle),
        PageBreak(),
    ]

    first_h1_seen = False
    for block_type, payload in parser.blocks:
        if block_type == "h1":
            if not first_h1_seen:
                first_h1_seen = True
                continue
            story.append(Paragraph(escape(payload), title))
        elif block_type == "h2":
            story.append(Paragraph(escape(payload), h2))
        elif block_type == "h3":
            story.append(Paragraph(escape(payload), h3))
        elif block_type == "p":
            story.append(Paragraph(escape(payload), body))
        elif block_type == "pre":
            story.append(Preformatted(payload, pre_style))
        elif block_type == "list":
            items = [
                ListItem(Paragraph(escape(item), bullet), leftIndent=12)
                for item in payload["items"]
            ]
            story.append(ListFlowable(items, bulletType="1" if payload["type"] == "ol" else "bullet", leftIndent=12))
            story.append(Spacer(1, 4))
        elif block_type == "table":
            table_data = []
            max_cols = max(len(row) for row in payload)
            for row_index, row in enumerate(payload):
                normalized = row + [""] * (max_cols - len(row))
                style = head_cell_style if row_index == 0 else cell_style
                table_data.append([Paragraph(escape(cell), style) for cell in normalized])
            col_width = (A4[0] - 32 * mm) / max_cols
            table = Table(table_data, colWidths=[col_width] * max_cols, repeatRows=1)
            table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#edf1f4")),
                ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#cfd8de")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]))
            story.append(table)
            story.append(Spacer(1, 8))

    doc = SimpleDocTemplate(
        str(PDF_PATH),
        pagesize=A4,
        rightMargin=16 * mm,
        leftMargin=16 * mm,
        topMargin=16 * mm,
        bottomMargin=16 * mm,
        title="Guia de Codigo para Sistemas Empresariales Modulares",
        author="Codex",
    )
    doc.build(story)


if __name__ == "__main__":
    build_pdf()
    print(PDF_PATH)
