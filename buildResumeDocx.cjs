/**
 * Build .docx from resume data (Option 2: docx package).
 * Spacing aligned to PDF (CSS rem -> twips: 0.85rem=204, 0.25rem=60, 0.5rem=120).
 * Supports: resumake-classic, resumake-classic-single, sidebar, and themed builders for
 * modern, professional, minimal, classic, creative, executive.
 * Photos are omitted in Word except sidebar, which embeds the cropped square.
 */
const { Document, Packer, Paragraph, TextRun, ImageRun, ExternalHyperlink, BorderStyle, AlignmentType, Table, TableRow, TableCell, WidthType, TabStopType, VerticalAlign } = require("docx");

// PDF-aligned spacing (twips). 1pt=20 twips; 0.85rem~10pt=200, 0.25rem~3pt=60, 0.5rem~6pt=120
const SP = {
  sectionBefore: 204,   // .resumake-classic-section-header margin-top 0.85rem
  headingAfter: 0,     // margin-bottom 0.025rem ~ 0
  lineAfter: 60,       // ::after line margin-top 0.25rem
  nameAfter: 80,       // name margin-bottom 0.25rem
  contactAfter: 120,   // contact margin-bottom 0.5rem
  itemAfter: 60,       // between title/position lines
  blockAfter: 120,     // after description block (0.5rem)
  shadedBefore: 204,
  shadedAfter: 100,    // academic-shaded-header margin-bottom 0.5rem
};

// PDF font sizes (docx half-points): 2.5rem~30pt=60, 1.125rem~13.5pt=27, 0.875rem~10.5pt=21, 0.75rem=9pt=18, 1rem~12pt=24
const SZ = { nameClassic: 60, section: 27, body: 21, skillLevel: 18, nameSingle: 24 };
const C = { dark: "333333", med: "374151", light: "6b7280" };  // PDF #333, #374151, #6b7280
const FONT = { georgia: "Georgia", times: "Times New Roman" };

function stripHtml(html) {
  if (!html || typeof html !== "string") return "";
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

// One description style for every builder. A list item is its own block.
// Plain HTML with no list stays one block, matching the old stripHtml line.
function htmlBlocks(html) {
  if (!html || typeof html !== "string") return [];
  if (!/<(ul|ol|li)\b/i.test(html)) {
    const text = stripHtml(html);
    return text ? [{ kind: "p", text }] : [];
  }
  const blocks = [];
  const listStack = [];
  const tokenRe = /<(\/?)(ul|ol|li)\b[^>]*>/gi;
  let last = 0;
  let match;
  let liOpen = false;
  let liStart = 0;
  let liKind = "ul";
  let liNumber = 1;

  function pushPlain(fragment) {
    const text = stripHtml(fragment);
    if (text) blocks.push({ kind: "p", text });
  }

  while ((match = tokenRe.exec(html))) {
    const closing = match[1] === "/";
    const tag = match[2].toLowerCase();
    if (!closing && (tag === "ul" || tag === "ol")) {
      if (!liOpen) pushPlain(html.slice(last, match.index));
      listStack.push({ kind: tag, number: 1 });
      last = match.index + match[0].length;
    } else if (closing && (tag === "ul" || tag === "ol")) {
      if (liOpen) {
        const text = stripHtml(html.slice(liStart, match.index));
        if (text) blocks.push({ kind: liKind, text, number: liNumber });
        liOpen = false;
      } else {
        pushPlain(html.slice(last, match.index));
      }
      listStack.pop();
      last = match.index + match[0].length;
    } else if (!closing && tag === "li") {
      if (liOpen) {
        const text = stripHtml(html.slice(liStart, match.index));
        if (text) blocks.push({ kind: liKind, text, number: liNumber });
      } else {
        pushPlain(html.slice(last, match.index));
      }
      const list = listStack[listStack.length - 1] || { kind: "ul", number: 1 };
      const dataList = /data-list\s*=\s*["']([^"']+)["']/i.exec(match[0]);
      const listed = dataList ? dataList[1].toLowerCase() : "";
      liKind = listed === "ordered" ? "ol" : listed === "bullet" || listed === "checked" || listed === "unchecked" ? "ul" : list.kind;
      liNumber = list.number;
      list.number += 1;
      liOpen = true;
      liStart = match.index + match[0].length;
      last = liStart;
    } else if (closing && tag === "li") {
      if (liOpen) {
        const text = stripHtml(html.slice(liStart, match.index));
        if (text) blocks.push({ kind: liKind, text, number: liNumber });
        liOpen = false;
      }
      last = match.index + match[0].length;
    }
  }
  if (liOpen) {
    const text = stripHtml(html.slice(liStart));
    if (text) blocks.push({ kind: liKind, text, number: liNumber });
  } else {
    pushPlain(html.slice(last));
  }
  return blocks;
}

function blockPrefix(block) {
  if (block.kind === "ul") return "• ";
  if (block.kind === "ol") return `${block.number}. `;
  return "";
}

function descriptionParagraphs(html, makeRun, after) {
  const blocks = htmlBlocks(html);
  return blocks.map((block, index) => {
    const last = index === blocks.length - 1;
    return new Paragraph({
      children: [makeRun(blockPrefix(block) + block.text)],
      alignment: block.kind === "p" ? AlignmentType.JUSTIFIED : AlignmentType.LEFT,
      spacing: { after: last ? after : 40 },
    });
  });
}

function joinFilled(parts, separator) {
  return parts.map((part) => (part && String(part).trim()) || "").filter(Boolean).join(separator);
}

const LINK_LABEL = { website: "Website", linkedin: "LinkedIn" };
const LINK_BLUE = "1D4ED8";

function externalHref(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function contactPieces(p, order) {
  const website = p.website && String(p.website).trim();
  const linkedin = p.linkedin && String(p.linkedin).trim();
  const bits = {
    email: p.email && String(p.email).trim(),
    phone: p.phone && String(p.phone).trim(),
    location: p.location && String(p.location).trim(),
    website: website ? { label: LINK_LABEL.website, href: externalHref(website) } : "",
    linkedin: linkedin ? { label: LINK_LABEL.linkedin, href: externalHref(linkedin) } : "",
  };
  return order.map((key) => bits[key]).filter(Boolean);
}

function webLink(label, href, opts) {
  return new ExternalHyperlink({
    link: href,
    children: [
      new TextRun({
        text: label,
        size: opts.size,
        color: opts.linkColor || LINK_BLUE,
        font: opts.font,
        underline: { type: "single", color: opts.linkColor || LINK_BLUE },
      }),
    ],
  });
}

function contactRuns(pieces, opts) {
  const children = [];
  pieces.forEach((part, index) => {
    if (index > 0) {
      children.push(new TextRun({ text: " | ", size: opts.size, color: opts.color, font: opts.font }));
    }
    if (part && part.href) children.push(webLink(part.label, part.href, opts));
    else children.push(new TextRun({ text: String(part), size: opts.size, color: opts.color, font: opts.font }));
  });
  return children;
}

function formatEducationScore(edu) {
  const value = edu && edu.gpa ? String(edu.gpa).trim() : "";
  if (!value) return "";
  if (edu.scoreType === "percentage") {
    const withPct = value.endsWith("%") ? value : value + "%";
    return "Percentage: " + withPct;
  }
  // A number with no type is not a GPA. Hide it until Percentage or GPA is chosen.
  if (!edu || edu.scoreType !== "gpa") return "";
  const stripped = value.replace(/\/\s*10$/i, "").trim();
  return "GPA: " + stripped + "/10";
}

function expiryText(date) {
  const formatted = formatDate(date);
  return formatted ? "Expires: " + formatted : "";
}

function plainLine(text, opts) {
  if (!text) return null;
  const style = opts || {};
  return new Paragraph({
    children: [
      new TextRun({
        text,
        size: style.size || SZ.body,
        color: style.color || C.light,
        font: style.font,
        italics: !!style.italics,
      }),
    ],
    spacing: { after: style.after == null ? 40 : style.after },
  });
}

function publicationLinkParagraph(link, opts) {
  const label = link && String(link).trim();
  const href = externalHref(label);
  if (!label || !href) return null;
  const style = opts || {};
  return new Paragraph({
    children: [
      webLink(label, href, {
        size: style.size || SZ.body,
        linkColor: style.linkColor || LINK_BLUE,
        font: style.font,
      }),
    ],
    spacing: { after: style.after == null ? SP.blockAfter : style.after },
  });
}

const EDUCATION_RIGHT_TAB = 9360;

function educationParagraphs(edu, dateStr, useTimes) {
  const place = [edu.school, edu.location].filter((part) => part && String(part).trim()).join(", ");
  const degree = edu.degree ? String(edu.degree).trim() : "";
  const field = edu.field ? String(edu.field).trim() : "";
  const score = formatEducationScore(edu);
  const run = (opts) => new TextRun(useTimes ? { ...opts, font: FONT.times } : opts);
  const noLine = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
  const borders = { top: noLine, bottom: noLine, left: noLine, right: noLine };
  const left = [
    new Paragraph({
      children: [
        run({ text: degree, bold: true, size: SZ.body, color: C.dark }),
        ...(place ? [run({ text: (degree ? ", " : "") + place, size: SZ.body, color: C.dark })] : []),
      ],
      spacing: { after: field ? 40 : SP.blockAfter },
    }),
  ];
  if (field) {
    left.push(new Paragraph({
      children: [run({ text: field, italics: true, size: SZ.skillLevel, color: C.med })],
      spacing: { after: SP.blockAfter },
    }));
  }
  const right = [
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [run({ text: dateStr || "", size: SZ.body, color: C.light })],
      spacing: { after: score ? 40 : SP.blockAfter },
    }),
  ];
  if (score) {
    right.push(new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [run({ text: score, size: SZ.skillLevel, color: C.light })],
      spacing: { after: SP.blockAfter },
    }));
  }
  return [
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: { ...borders, insideHorizontal: noLine, insideVertical: noLine },
      rows: [
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({
              width: { size: 70, type: WidthType.PERCENTAGE },
              borders,
              verticalAlign: VerticalAlign.TOP,
              margins: { top: 0, bottom: 0, left: 0, right: 120 },
              children: left,
            }),
            new TableCell({
              width: { size: 30, type: WidthType.PERCENTAGE },
              borders,
              verticalAlign: VerticalAlign.TOP,
              margins: { top: 0, bottom: 0, left: 0, right: 0 },
              children: right,
            }),
          ],
        }),
      ],
    }),
  ];
}

function formatDate(dateString) {
  if (!dateString) return "";
  const d = new Date(dateString);
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function sectionHeadingWithLine(text) {
  return [
    new Paragraph({
      children: [new TextRun({ text, bold: true, size: SZ.section, color: C.dark })],
      spacing: { before: SP.sectionBefore, after: SP.headingAfter },
    }),
    new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: C.dark } },
      spacing: { after: SP.lineAfter },
    }),
  ];
}

function shadedSectionHeading(text) {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: SZ.body, font: FONT.times })],
    shading: { fill: "F3F4F6" },
    border: {
      top: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
      left: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
      right: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
    },
    spacing: { before: SP.shadedBefore, after: SP.shadedAfter },
  });
}

function namedSkills(skills) {
  return (skills || []).filter((skill) => skill && String(skill.name || "").trim());
}

// PDF: .resumake-classic-skill-item = name (bold #333) + level (0.75rem #6b7280)
function skillsTable(skills, useTimesFont) {
  if (!skills || skills.length === 0) return [];
  const half = Math.ceil(skills.length / 2);
  const left = skills.slice(0, half);
  const right = skills.slice(half);
  const maxRows = Math.max(left.length, right.length);
  const rowSpacing = { after: 40 };
  const nameRun = (s) => new TextRun({ text: s.name, bold: true, size: SZ.body, color: C.dark, font: useTimesFont ? FONT.times : undefined });
  const levelRun = (s) => new TextRun({ text: s.level || "", size: SZ.skillLevel, color: C.light, font: useTimesFont ? FONT.times : undefined });
  const rows = [];
  for (let i = 0; i < maxRows; i++) {
    const l = left[i];
    const r = right[i];
    rows.push(
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: l ? [nameRun(l), new TextRun({ text: "\t" }), levelRun(l)] : [new TextRun({ text: "" })],
                spacing: rowSpacing,
              }),
            ],
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: r ? [nameRun(r), new TextRun({ text: "\t" }), levelRun(r)] : [new TextRun({ text: "" })],
                spacing: rowSpacing,
              }),
            ],
          }),
        ],
      })
    );
  }
  return [
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
      rows,
    }),
  ];
}

function buildResumakeClassic(data) {
  const children = [];
  const p = data.personalInfo;

  children.push(
    new Paragraph({
      children: [new TextRun({ text: p.fullName || "Your Name", size: SZ.nameClassic, font: FONT.georgia, color: C.dark })],
      alignment: AlignmentType.CENTER,
      spacing: { after: SP.nameAfter },
    })
  );
  const contactPiecesClassic = contactPieces(p, ["email", "phone", "location", "website", "linkedin"]);
  if (contactPiecesClassic.length) {
    children.push(
      new Paragraph({
        children: contactRuns(contactPiecesClassic, { size: SZ.body, color: C.med, linkColor: LINK_BLUE }),
        alignment: AlignmentType.CENTER,
        spacing: { after: SP.contactAfter },
      })
    );
  }

  if (p.summary) {
    children.push(...sectionHeadingWithLine("Professional Summary"));
    children.push(...descriptionParagraphs(p.summary, (text) => new TextRun({ text, size: SZ.body, color: C.med }), SP.blockAfter));
  }

  if (data.experience && data.experience.length > 0) {
    children.push(...sectionHeadingWithLine("Professional Experience"));
    data.experience.forEach((exp) => {
      const dateStr = `${formatDate(exp.startDate)} - ${exp.current ? "Present" : formatDate(exp.endDate)}`;
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${exp.company}${exp.location ? ", " + exp.location : ""}`, bold: true, size: SZ.body, color: C.dark }),
            new TextRun({ text: `\t${dateStr}`, size: SZ.body, color: C.light }),
          ],
          spacing: { after: 40 },
        }),
        new Paragraph({
          children: [new TextRun({ text: exp.position, italics: true, size: SZ.body, color: C.med })],
          spacing: { after: SP.itemAfter },
        })
      );
      children.push(...descriptionParagraphs(exp.description, (text) => new TextRun({ text, size: SZ.body, color: C.med }), SP.blockAfter));
    });
  }

  if (data.education && data.education.length > 0) {
    children.push(...sectionHeadingWithLine("Education"));
    data.education.forEach((edu) => {
      const dateStr = formatDateRange(edu.startDate, edu.endDate, edu.current, " - ", "Pursuing");
      children.push(...educationParagraphs(edu, dateStr, false));
    });
  }

  const classicSkills = namedSkills(data.skills);
  if (classicSkills.length > 0) {
    children.push(...sectionHeadingWithLine("Skills"));
    children.push(...skillsTable(classicSkills, false));
    children.push(new Paragraph({ text: "", spacing: { after: SP.blockAfter } }));
  }

  if (data.projects && data.projects.length > 0) {
    children.push(...sectionHeadingWithLine("Projects"));
    data.projects.forEach((proj) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: proj.name, bold: true, size: SZ.body, color: C.dark }),
            ...(proj.date ? [new TextRun({ text: `\t${formatDate(proj.date)}`, size: SZ.body, color: C.light })] : []),
          ],
          spacing: { after: 40 },
        })
      );
      if (proj.technologies) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: proj.technologies, italics: true, size: SZ.body, color: C.med })],
            spacing: { after: SP.itemAfter },
          })
        );
      }
      children.push(...descriptionParagraphs(proj.description, (text) => new TextRun({ text, size: SZ.body, color: C.med }), SP.blockAfter));
    });
  }

  if (data.achievements && data.achievements.length > 0) {
    children.push(...sectionHeadingWithLine("Achievements"));
    data.achievements.forEach((a) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: a.title, bold: true, size: SZ.body, color: C.dark }),
            ...(a.date ? [new TextRun({ text: `\t${formatDate(a.date)}`, size: SZ.body, color: C.light })] : []),
          ],
          spacing: { after: SP.itemAfter },
        })
      );
      children.push(...descriptionParagraphs(a.description, (text) => new TextRun({ text, size: SZ.body, color: C.med }), SP.blockAfter));
    });
  }

  if (data.awards && data.awards.length > 0) {
    children.push(...sectionHeadingWithLine("Awards"));
    data.awards.forEach((a) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: a.title, bold: true, size: SZ.body, color: C.dark }),
            new TextRun({ text: `\t${formatDate(a.date)}`, size: SZ.body, color: C.light }),
          ],
          spacing: { after: 40 },
        }),
        new Paragraph({
          children: [new TextRun({ text: a.issuer, italics: true, size: SZ.body, color: C.med })],
          spacing: { after: SP.itemAfter },
        })
      );
      children.push(...descriptionParagraphs(a.description, (text) => new TextRun({ text, size: SZ.body, color: C.med }), SP.blockAfter));
    });
  }

  if (data.certifications && data.certifications.length > 0) {
    children.push(...sectionHeadingWithLine("Certifications"));
    data.certifications.forEach((c) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: c.name, bold: true, size: SZ.body, color: C.dark }),
            new TextRun({ text: `\t${formatDate(c.date)}`, size: SZ.body, color: C.light }),
          ],
          spacing: { after: 40 },
        }),
        new Paragraph({
          children: [new TextRun({ text: c.issuer, italics: true, size: SZ.body, color: C.med })],
          spacing: { after: SP.itemAfter },
        })
      );
      const expiry = plainLine(expiryText(c.expiryDate), { color: C.light, after: 40 });
      if (expiry) children.push(expiry);
      if (c.credentialId) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: "Credential ID: " + c.credentialId, size: SZ.body, color: C.light })],
            spacing: { after: SP.blockAfter },
          })
        );
      }
      children.push(...descriptionParagraphs(c.description, (text) => new TextRun({ text, size: SZ.body, color: C.med }), SP.blockAfter));
    });
  }

  if (data.publications && data.publications.length > 0) {
    children.push(...sectionHeadingWithLine("Publications"));
    data.publications.forEach((pub) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: pub.title, bold: true, size: SZ.body, color: C.dark }),
            new TextRun({ text: `\t${formatDate(pub.date)}`, size: SZ.body, color: C.light }),
          ],
          spacing: { after: 40 },
        }),
        new Paragraph({
          children: [new TextRun({ text: pub.journal, italics: true, size: SZ.body, color: C.med })],
          spacing: { after: SP.itemAfter },
        })
      );
      if (pub.authors) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: "Authors: " + pub.authors, size: SZ.body, color: C.light })],
            spacing: { after: SP.blockAfter },
          })
        );
      }
      const link = publicationLinkParagraph(pub.link, { linkColor: LINK_BLUE });
      if (link) children.push(link);
    });
  }

  return new Document({
    sections: [{ properties: {}, children }],
  });
}

function buildResumakeClassicSingle(data) {
  const children = [];
  const p = data.personalInfo;

  const shadedContact = contactPieces(p, ["email", "phone", "linkedin", "website", "location"]);
  const tr = (opts) => ({ ...opts, font: FONT.times });
  children.push(
    new Paragraph({
      children: [
        new TextRun(tr({ text: p.fullName || "Your Name", bold: true, size: SZ.nameSingle })),
        new TextRun(tr({ text: "\t\t\t", size: SZ.body, color: C.med })),
        ...contactRuns(shadedContact, { size: SZ.body, color: C.med, font: FONT.times, linkColor: LINK_BLUE }),
      ],
      spacing: { after: SP.contactAfter },
    })
  );

  if (p.summary) {
    children.push(shadedSectionHeading("Professional Summary"));
    children.push(...descriptionParagraphs(p.summary, (text) => new TextRun(tr({ text, size: SZ.body })), SP.blockAfter));
  }

  if (data.experience && data.experience.length > 0) {
    children.push(shadedSectionHeading("Experience"));
    data.experience.forEach((exp) => {
      const dateStr = `${formatDate(exp.startDate)} | ${exp.current ? "Present" : formatDate(exp.endDate)}`;
      children.push(
        new Paragraph({
          children: [
            new TextRun(tr({ text: `${exp.company}${exp.location ? ", " + exp.location : ""}`, bold: true, size: SZ.body })),
            new TextRun(tr({ text: `\t${dateStr}`, size: SZ.body, color: C.light })),
          ],
          spacing: { after: 40 },
        }),
        new Paragraph({
          children: [new TextRun(tr({ text: exp.position, bold: true, size: SZ.body }))],
          spacing: { after: SP.itemAfter },
        })
      );
      children.push(...descriptionParagraphs(exp.description, (text) => new TextRun(tr({ text, size: SZ.body })), SP.blockAfter));
    });
  }

  const shadedSkills = namedSkills(data.skills);
  if (shadedSkills.length > 0) {
    children.push(shadedSectionHeading("Skills"));
    children.push(...skillsTable(shadedSkills, true));
    children.push(new Paragraph({ text: "", spacing: { after: SP.blockAfter } }));
  }

  if (data.projects && data.projects.length > 0) {
    children.push(shadedSectionHeading("Projects"));
    data.projects.forEach((proj) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun(tr({ text: proj.name, bold: true, size: SZ.body })),
            ...(proj.date ? [new TextRun(tr({ text: `\t${formatDate(proj.date)}`, size: SZ.body, color: C.light }))] : []),
          ],
          spacing: { after: SP.itemAfter },
        })
      );
      children.push(...descriptionParagraphs(proj.description, (text) => new TextRun(tr({ text, size: SZ.body })), SP.blockAfter));
      if (proj.technologies) {
        children.push(
          new Paragraph({
            children: [new TextRun(tr({ text: "Skills: " + proj.technologies, size: SZ.body }))],
            spacing: { after: SP.blockAfter },
          })
        );
      }
    });
  }

  if (data.education && data.education.length > 0) {
    children.push(shadedSectionHeading("Education"));
    data.education.forEach((edu) => {
      const dateStr = formatDateRange(edu.startDate, edu.endDate, edu.current, " | ", "Pursuing");
      children.push(...educationParagraphs(edu, dateStr, true));
    });
  }

  if (data.achievements && data.achievements.length > 0) {
    children.push(shadedSectionHeading("Achievements"));
    data.achievements.forEach((a) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun(tr({ text: a.title, bold: true, size: SZ.body })),
            ...(a.date ? [new TextRun(tr({ text: `\t${formatDate(a.date)}`, size: SZ.body, color: C.light }))] : []),
          ],
          spacing: { after: SP.itemAfter },
        })
      );
      children.push(...descriptionParagraphs(a.description, (text) => new TextRun(tr({ text, size: SZ.body })), SP.blockAfter));
    });
  }

  if (data.awards && data.awards.length > 0) {
    children.push(shadedSectionHeading("Awards"));
    data.awards.forEach((a) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun(tr({ text: a.title, bold: true, size: SZ.body })),
            new TextRun(tr({ text: `\t${formatDate(a.date)}`, size: SZ.body, color: C.light })),
          ],
          spacing: { after: 40 },
        })
      );
      children.push(...descriptionParagraphs(a.description, (text) => new TextRun(tr({ text, size: SZ.body })), SP.blockAfter));
    });
  }

  if (data.certifications && data.certifications.length > 0) {
    children.push(shadedSectionHeading("Certifications"));
    data.certifications.forEach((c) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun(tr({ text: c.name, bold: true, size: SZ.body })),
            new TextRun(tr({ text: `\t${formatDate(c.date)}`, size: SZ.body, color: C.light })),
          ],
          spacing: { after: 40 },
        }),
        new Paragraph({
          children: [new TextRun(tr({ text: c.issuer, italics: true, size: SZ.body }))],
          spacing: { after: SP.itemAfter },
        })
      );
      const expiry = plainLine(expiryText(c.expiryDate), { color: C.light, font: FONT.times, after: 40 });
      if (expiry) children.push(expiry);
      if (c.credentialId) {
        children.push(
          new Paragraph({
            children: [new TextRun(tr({ text: "Credential ID: " + c.credentialId, size: SZ.body, color: C.light }))],
            spacing: { after: SP.blockAfter },
          })
        );
      }
      children.push(...descriptionParagraphs(c.description, (text) => new TextRun(tr({ text, size: SZ.body })), SP.blockAfter));
    });
  }

  if (data.publications && data.publications.length > 0) {
    children.push(shadedSectionHeading("Publications"));
    data.publications.forEach((pub) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun(tr({ text: pub.title, bold: true, size: SZ.body })),
            new TextRun(tr({ text: `\t${formatDate(pub.date)}`, size: SZ.body, color: C.light })),
          ],
          spacing: { after: 40 },
        }),
        new Paragraph({
          children: [new TextRun(tr({ text: pub.journal, italics: true, size: SZ.body }))],
          spacing: { after: SP.itemAfter },
        })
      );
      if (pub.authors) {
        children.push(
          new Paragraph({
            children: [new TextRun(tr({ text: "Authors: " + pub.authors, size: SZ.body, color: C.light }))],
            spacing: { after: SP.blockAfter },
          })
        );
      }
      const link = publicationLinkParagraph(pub.link, { font: FONT.times, linkColor: LINK_BLUE });
      if (link) children.push(link);
    });
  }

  return new Document({
    sections: [{ properties: {}, children }],
  });
}

function formatPlace(name, location) {
  return joinFilled([name, location], ", ");
}

function formatDateRange(start, end, current, separator, ongoing) {
  return joinFilled([formatDate(start), current ? (ongoing || "Present") : formatDate(end)], separator || " - ");
}

function headingBar(text, color) {
  const lineColor = color || C.dark;
  return [
    new Paragraph({
      children: [new TextRun({ text, bold: true, size: SZ.section, color: lineColor })],
      spacing: { before: 180, after: 0 },
    }),
    new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: lineColor } },
      spacing: { after: 80 },
    }),
  ];
}

function headingUpper(text) {
  return [
    new Paragraph({
      children: [new TextRun({ text: String(text).toUpperCase(), bold: true, size: SZ.section, color: C.dark })],
      spacing: { before: 180, after: 60 },
    }),
  ];
}

function itemRow(leftBold, leftRest, dateStr) {
  const children = [
    new TextRun({ text: leftBold || "", bold: true, size: SZ.body, color: C.dark }),
  ];
  if (leftRest) {
    children.push(new TextRun({ text: leftRest, size: SZ.body, color: C.dark }));
  }
  if (dateStr) {
    children.push(new TextRun({ text: "\t" + dateStr, size: SZ.body, color: C.light }));
  }
  return new Paragraph({
    tabStops: [{ type: TabStopType.RIGHT, position: EDUCATION_RIGHT_TAB }],
    children,
    spacing: { after: 40 },
  });
}

function appendThemedSections(children, data, theme) {
  const heading = (text) =>
    theme.heading === "upper" ? headingUpper(text) : headingBar(text, theme.color);
  const p = data.personalInfo || {};
  const dateSep = theme.dateSep || " - ";

  if (p.summary) {
    children.push(...heading(theme.labels.summary));
    children.push(...descriptionParagraphs(p.summary, (text) => new TextRun({ text, size: SZ.body, color: C.med }), SP.blockAfter));
  }

  if (data.experience && data.experience.length > 0) {
    children.push(...heading(theme.labels.experience));
    data.experience.forEach((exp) => {
      const dateStr = formatDateRange(exp.startDate, exp.endDate, exp.current, dateSep);
      const place = formatPlace(exp.company, exp.location);
      if (theme.experience === "position-first") {
        children.push(itemRow(exp.position, "", dateStr));
        if (place) {
          children.push(
            new Paragraph({
              children: [new TextRun({ text: place, size: SZ.body, color: C.med })],
              spacing: { after: SP.itemAfter },
            })
          );
        }
      } else {
        children.push(itemRow(place, "", dateStr));
        if (exp.position) {
          children.push(
            new Paragraph({
              children: [new TextRun({ text: exp.position, italics: true, size: SZ.body, color: C.med })],
              spacing: { after: SP.itemAfter },
            })
          );
        }
      }
      children.push(...descriptionParagraphs(exp.description, (text) => new TextRun({ text, size: SZ.body, color: C.med }), SP.blockAfter));
    });
  }

  if (data.education && data.education.length > 0) {
    children.push(...heading(theme.labels.education));
    data.education.forEach((edu) => {
      const dateStr = formatDateRange(edu.startDate, edu.endDate, edu.current, dateSep, "Pursuing");
      children.push(...educationParagraphs(edu, dateStr, false));
    });
  }

  const themeSkills = namedSkills(data.skills);
  if (themeSkills.length > 0) {
    children.push(...heading(theme.labels.skills));
    if (theme.skills === "inline") {
      const line = themeSkills.map((s) => (s.level ? `${s.name} (${s.level})` : s.name)).filter(Boolean).join(", ");
      children.push(
        new Paragraph({
          children: [new TextRun({ text: line, size: SZ.body, color: C.med })],
          spacing: { after: SP.blockAfter },
        })
      );
    } else {
      children.push(...skillsTable(themeSkills, false));
      children.push(new Paragraph({ text: "", spacing: { after: SP.blockAfter } }));
    }
  }

  if (data.projects && data.projects.length > 0) {
    children.push(...heading(theme.labels.projects));
    data.projects.forEach((proj) => {
      children.push(
        itemRow(proj.name, "", proj.date ? formatDate(proj.date) : "")
      );
      if (proj.technologies) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: proj.technologies, italics: true, size: SZ.body, color: C.med })],
            spacing: { after: SP.itemAfter },
          })
        );
      }
      children.push(...descriptionParagraphs(proj.description, (text) => new TextRun({ text, size: SZ.body, color: C.med }), SP.blockAfter));
    });
  }

  if (data.achievements && data.achievements.length > 0) {
    children.push(...heading(theme.labels.achievements));
    data.achievements.forEach((a) => {
      children.push(itemRow(a.title, "", a.date ? formatDate(a.date) : ""));
      children.push(...descriptionParagraphs(a.description, (text) => new TextRun({ text, size: SZ.body, color: C.med }), SP.blockAfter));
    });
  }

  if (data.awards && data.awards.length > 0) {
    children.push(...heading(theme.labels.awards));
    data.awards.forEach((a) => {
      children.push(itemRow(a.title, "", a.date ? formatDate(a.date) : ""));
      if (a.issuer) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: a.issuer, italics: true, size: SZ.body, color: C.med })],
            spacing: { after: SP.itemAfter },
          })
        );
      }
      children.push(...descriptionParagraphs(a.description, (text) => new TextRun({ text, size: SZ.body, color: C.med }), SP.blockAfter));
    });
  }

  if (data.certifications && data.certifications.length > 0) {
    children.push(...heading(theme.labels.certs));
    data.certifications.forEach((c) => {
      children.push(itemRow(c.name, "", c.date ? formatDate(c.date) : ""));
      if (c.issuer) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: c.issuer, italics: true, size: SZ.body, color: C.med })],
            spacing: { after: SP.itemAfter },
          })
        );
      }
      const expiry = plainLine(expiryText(c.expiryDate), { color: C.light, after: 40 });
      if (expiry) children.push(expiry);
      if (c.credentialId) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: "Credential ID: " + c.credentialId, size: SZ.body, color: C.light })],
            spacing: { after: SP.blockAfter },
          })
        );
      }
      children.push(...descriptionParagraphs(c.description, (text) => new TextRun({ text, size: SZ.body, color: C.med }), SP.blockAfter));
    });
  }

  if (data.publications && data.publications.length > 0) {
    children.push(...heading(theme.labels.pubs));
    data.publications.forEach((pub) => {
      children.push(itemRow(pub.title, "", pub.date ? formatDate(pub.date) : ""));
      if (pub.journal) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: pub.journal, italics: true, size: SZ.body, color: C.med })],
            spacing: { after: SP.itemAfter },
          })
        );
      }
      if (pub.authors) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: "Authors: " + pub.authors, size: SZ.body, color: C.light })],
            spacing: { after: SP.blockAfter },
          })
        );
      }
      const link = publicationLinkParagraph(pub.link, { linkColor: theme.linkColor || LINK_BLUE });
      if (link) children.push(link);
    });
  }
}

function buildThemedResume(data, theme) {
  const children = [];
  const p = data.personalInfo || {};
  const nameAlign = theme.nameAlign === "center" ? AlignmentType.CENTER : AlignmentType.LEFT;

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: p.fullName || "Your Name",
          bold: true,
          size: theme.nameSize || 48,
          color: theme.nameColor || C.dark,
        }),
      ],
      alignment: nameAlign,
      spacing: { after: SP.nameAfter },
    })
  );

  const linkColor = theme.linkColor || LINK_BLUE;
  const runOpts = { size: SZ.body, color: C.med, linkColor };
  if (theme.contact === "stacked") {
    contactPieces(p, ["location", "phone", "email", "website", "linkedin"]).forEach((part) => {
      children.push(
        new Paragraph({
          children: part && part.href ? [webLink(part.label, part.href, runOpts)] : [new TextRun({ text: String(part), size: SZ.body, color: C.med })],
          alignment: nameAlign,
          spacing: { after: 20 },
        })
      );
    });
    children.push(new Paragraph({ text: "", spacing: { after: SP.contactAfter } }));
  } else {
    const pieces =
      theme.contact === "shaded"
        ? contactPieces(p, ["email", "phone", "linkedin", "website", "location"])
        : contactPieces(p, ["email", "phone", "location", "website", "linkedin"]);
    if (pieces.length) {
      children.push(
        new Paragraph({
          children: contactRuns(pieces, runOpts),
          alignment: nameAlign,
          spacing: { after: SP.contactAfter },
        })
      );
    }
  }

  appendThemedSections(children, data, theme);
  return new Document({ sections: [{ properties: {}, children }] });
}

const DEFAULT_LABELS = {
  summary: "Professional Summary",
  experience: "Professional Experience",
  education: "Education",
  skills: "Skills",
  projects: "Projects",
  achievements: "Achievements",
  awards: "Awards",
  certs: "Courses & Certifications",
  pubs: "Publications",
};

function buildModern(data) {
  return buildThemedResume(data, {
    color: "2C4869",
    nameSize: 56,
    experience: "position-first",
    labels: DEFAULT_LABELS,
  });
}

function buildProfessional(data) {
  return buildThemedResume(data, {
    color: "374151",
    nameSize: 56,
    experience: "position-first",
    labels: { ...DEFAULT_LABELS, skills: "Core Competencies", projects: "Key Projects" },
  });
}

function buildMinimal(data) {
  return buildThemedResume(data, {
    color: "9CA3AF",
    nameSize: 44,
    skills: "inline",
    experience: "position-first",
    labels: DEFAULT_LABELS,
  });
}

function buildTraditionalClassic(data) {
  return buildThemedResume(data, {
    heading: "upper",
    nameAlign: "center",
    contact: "stacked",
    experience: "position-first",
    labels: { ...DEFAULT_LABELS, summary: "Objective" },
  });
}

function buildCreative(data) {
  return buildThemedResume(data, {
    color: "0D9488",
    nameSize: 56,
    linkColor: "6D28D9",
    skills: "inline",
    experience: "position-first",
    labels: { ...DEFAULT_LABELS, skills: "Skills & Expertise", projects: "Creative Projects" },
  });
}

function buildExecutive(data) {
  return buildThemedResume(data, {
    color: "111827",
    nameSize: 64,
    nameColor: "111827",
    experience: "position-first",
    labels: {
      ...DEFAULT_LABELS,
      skills: "Core Competencies",
      projects: "Strategic Initiatives",
      achievements: "Key Achievements",
    },
  });
}

const SIDEBAR_NAVY = "1B3A4B";
const SIDEBAR_RAIL = 3800;
const SIDEBAR_MAIN = 8080;
const SIDEBAR_PAGE = SIDEBAR_RAIL + SIDEBAR_MAIN;
const noLine = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noCellBorders = { top: noLine, bottom: noLine, left: noLine, right: noLine };

function sidebarDateRange(start, end, current, ongoing) {
  const left = formatDate(start);
  const right = current ? (ongoing || "Present") : formatDate(end);
  return [left, right].filter(Boolean).join(" - ");
}

function sidebarPhotoRun(dataUrl) {
  if (!dataUrl || typeof dataUrl !== "string") return null;
  const match = dataUrl.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/i);
  if (!match) return null;
  return new ImageRun({
    type: match[1].toLowerCase() === "png" ? "png" : "jpg",
    data: Buffer.from(match[2], "base64"),
    transformation: { width: 110, height: 110 },
  });
}

function sidebarRailParagraph(text, opts = {}) {
  return new Paragraph({
    alignment: opts.align || AlignmentType.LEFT,
    spacing: { before: opts.before || 0, after: opts.after == null ? 60 : opts.after },
    children: [
      new TextRun({
        text,
        bold: !!opts.bold,
        italics: !!opts.italics,
        size: opts.size || 18,
        color: opts.color || "FFFFFF",
        font: "Calibri",
      }),
    ],
  });
}

function sidebarMainParagraph(runs, opts = {}) {
  return new Paragraph({
    alignment: opts.align,
    spacing: { before: opts.before || 0, after: opts.after == null ? 60 : opts.after },
    border: opts.border,
    children: runs,
  });
}

function sidebarDescriptionParagraphs(html, after) {
  const blocks = htmlBlocks(html);
  return blocks.map((block, index) =>
    sidebarMainParagraph(
      [new TextRun({ text: blockPrefix(block) + block.text, size: 20, color: "374151", font: "Calibri" })],
      { after: index === blocks.length - 1 ? after : 40 }
    )
  );
}

function sidebarHeading(label) {
  return sidebarMainParagraph(
    [new TextRun({ text: label.toUpperCase(), bold: true, size: 18, color: "222222", font: "Calibri", characterSpacing: 60 })],
    { before: 200, after: 80, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "D5D8DC" } } }
  );
}

function buildSidebar(data) {
  const p = data.personalInfo || {};
  const rail = [];
  const main = [];

  const photo = sidebarPhotoRun(p.photo);
  if (photo) {
    rail.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [photo] }));
  }

  const contact = [
    ["Phone", p.phone, false],
    ["Email", p.email, false],
    ["Location", p.location, false],
    [LINK_LABEL.website, p.website, true],
    [LINK_LABEL.linkedin, p.linkedin, true],
  ].filter(([, value]) => value && String(value).trim());
  if (contact.length) {
    rail.push(sidebarRailParagraph("CONTACT", { bold: true, size: 20, before: 80, after: 80 }));
    contact.forEach(([label, value, isLink]) => {
      const text = String(value).trim();
      if (isLink) {
        rail.push(
          new Paragraph({
            spacing: { before: 0, after: 40 },
            children: [webLink(label, externalHref(text), { size: 18, linkColor: "7DD3FC", font: "Calibri" })],
          })
        );
      } else {
        rail.push(sidebarRailParagraph(text, { size: 18, after: 40 }));
      }
    });
  }

  if (data.education && data.education.length) {
    rail.push(sidebarRailParagraph("EDUCATION", { bold: true, size: 20, before: 200, after: 80 }));
    data.education.forEach((edu) => {
      const place = [edu.school, edu.location].filter((part) => part && String(part).trim()).join(", ");
      const field = edu.field ? String(edu.field).trim() : "";
      const score = formatEducationScore(edu);
      const dates = sidebarDateRange(edu.startDate, edu.endDate, edu.current, "Pursuing");
      if (place) rail.push(sidebarRailParagraph(place, { bold: true, size: 20, after: 20 }));
      if (edu.degree && String(edu.degree).trim()) rail.push(sidebarRailParagraph(String(edu.degree).trim(), { after: 20 }));
      if (field) rail.push(sidebarRailParagraph(field, { after: 20 }));
      if (score) rail.push(sidebarRailParagraph(score, { after: 20 }));
      if (dates) rail.push(sidebarRailParagraph(dates, { after: 120 }));
    });
  }

  const skills = namedSkills(data.skills);
  if (skills.length) {
    rail.push(sidebarRailParagraph("SKILLS", { bold: true, size: 20, before: 160, after: 80 }));
    skills.forEach((skill) => {
      const level = skill.level && String(skill.level).trim();
      rail.push(sidebarRailParagraph("•  " + skill.name.trim() + (level ? "  " + level : ""), { after: 40 }));
    });
  }
  if (!rail.length) rail.push(sidebarRailParagraph(""));

  const nameWords = (p.fullName || "Your Name").trim().split(/\s+/).filter(Boolean);
  nameWords.forEach((word, index) => {
    main.push(
      sidebarMainParagraph(
        [new TextRun({ text: word.toUpperCase(), bold: true, size: 56, color: "2A2A2A", font: "Calibri" })],
        { after: index === nameWords.length - 1 ? 200 : 0 }
      )
    );
  });

  if (p.summary) {
    main.push(sidebarHeading("About Me"));
    main.push(...sidebarDescriptionParagraphs(p.summary, 80));
  }

  if (data.experience && data.experience.length) {
    main.push(sidebarHeading("Experience"));
    data.experience.forEach((exp) => {
      const place = [exp.company, exp.location].filter((part) => part && String(part).trim()).join(", ");
      const dates = sidebarDateRange(exp.startDate, exp.endDate, exp.current);
      main.push(
        sidebarMainParagraph(
          [
            new TextRun({ text: "●  " + (exp.position || ""), bold: true, size: 22, color: "1A1A1A", font: "Calibri" }),
            ...(dates ? [new TextRun({ text: "    " + dates, size: 18, color: "6B7280", font: "Calibri" })] : []),
          ],
          { before: 80, after: 20 }
        )
      );
      if (place) {
        main.push(sidebarMainParagraph([new TextRun({ text: place, italics: true, size: 20, color: "4B5563", font: "Calibri" })], { after: 40 }));
      }
      main.push(...sidebarDescriptionParagraphs(exp.description, 80));
    });
  }

  const extraSections = [
    ["Projects", data.projects, (item) => ({ title: item.name, sub: item.technologies, date: item.date, body: item.description })],
    ["Achievements", data.achievements, (item) => ({ title: item.title, date: item.date, body: item.description })],
    ["Awards", data.awards, (item) => ({ title: item.title, sub: item.issuer, date: item.date, body: item.description })],
    ["Certifications", data.certifications, (item) => ({ title: item.name, sub: item.issuer, date: item.date, note: item.credentialId ? "Credential ID: " + item.credentialId : "", extra: expiryText(item.expiryDate), body: item.description })],
    ["Publications", data.publications, (item) => ({ title: item.title, sub: item.journal, note: item.authors ? "Authors: " + item.authors : "", date: item.date, link: item.link })],
  ];
  extraSections.forEach(([label, items, mapItem]) => {
    if (!items || !items.length) return;
    main.push(sidebarHeading(label));
    items.forEach((item) => {
      const row = mapItem(item);
      const dateText = row.date ? formatDate(row.date) : "";
      main.push(
        sidebarMainParagraph(
          [
            new TextRun({ text: row.title || "", bold: true, size: 22, color: "1A1A1A", font: "Calibri" }),
            ...(dateText ? [new TextRun({ text: "    " + dateText, size: 18, color: "6B7280", font: "Calibri" })] : []),
          ],
          { before: 60, after: 20 }
        )
      );
      if (row.sub) main.push(sidebarMainParagraph([new TextRun({ text: row.sub, italics: true, size: 20, color: "4B5563", font: "Calibri" })], { after: 20 }));
      if (row.note) main.push(sidebarMainParagraph([new TextRun({ text: row.note, size: 18, color: "4B5563", font: "Calibri" })], { after: 20 }));
      if (row.extra) main.push(sidebarMainParagraph([new TextRun({ text: row.extra, size: 18, color: "4B5563", font: "Calibri" })], { after: 20 }));
      const link = publicationLinkParagraph(row.link, { size: 18, linkColor: LINK_BLUE, font: "Calibri", after: 60 });
      if (link) main.push(link);
      main.push(...sidebarDescriptionParagraphs(row.body, 60));
    });
  });

  if (!main.length) main.push(sidebarMainParagraph([new TextRun({ text: "" })]));

  const railCell = new TableCell({
    width: { size: SIDEBAR_RAIL, type: WidthType.DXA },
    verticalAlign: VerticalAlign.TOP,
    shading: { fill: SIDEBAR_NAVY },
    borders: noCellBorders,
    margins: { top: 220, bottom: 200, left: 200, right: 160 },
    children: rail,
  });
  const mainCell = new TableCell({
    width: { size: SIDEBAR_MAIN, type: WidthType.DXA },
    verticalAlign: VerticalAlign.TOP,
    borders: noCellBorders,
    margins: { top: 220, bottom: 200, left: 240, right: 220 },
    children: main,
  });

  const table = new Table({
    width: { size: SIDEBAR_PAGE, type: WidthType.DXA },
    columnWidths: [SIDEBAR_RAIL, SIDEBAR_MAIN],
    borders: noCellBorders,
    rows: [new TableRow({ cantSplit: true, children: [railCell, mainCell] })],
  });

  return new Document({
    sections: [
      {
        properties: {
          page: { margin: { top: 280, bottom: 280, left: 0, right: 280 } },
        },
        children: [table],
      },
    ],
  });
}

async function buildDocx(resumeData, templateId) {
  const builders = {
    modern: buildModern,
    professional: buildProfessional,
    minimal: buildMinimal,
    classic: buildTraditionalClassic,
    creative: buildCreative,
    executive: buildExecutive,
    "resumake-classic": buildResumakeClassic,
    "resumake-classic-single": buildResumakeClassicSingle,
    sidebar: buildSidebar,
  };
  const build = builders[templateId] || buildResumakeClassic;
  const doc = build(resumeData);
  return Packer.toBuffer(doc);
}

module.exports = { buildDocx, htmlBlocks };
