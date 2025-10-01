import type { Speech, Point } from '../types';
import saveAs from 'file-saver';

// These are globals from the scripts in index.html
declare const marked: any;
declare const JSZip: any;

// Helper to sanitize strings for XML
const escapeXml = (unsafe: string): string => {
    return unsafe.replace(/[<>&'"]/g, (c) => {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
            default: return c;
        }
    });
};


const generatePointHtmlRecursive = (point: Point): string => {
    let html = `<h${point.level}>${escapeXml(point.title)}</h${point.level}>`;
    point.content.forEach(contentItem => {
        html += marked.parse(contentItem.html);
    });
    point.subPoints.forEach(subPoint => {
        html += generatePointHtmlRecursive(subPoint);
    });
    return html;
};

const generateChapterHtml = (mainPoint: Point): string => {
    let body = `<h2>${escapeXml(mainPoint.title)}</h2>`;
    mainPoint.content.forEach(contentItem => {
        body += marked.parse(contentItem.html);
    });
    mainPoint.subPoints.forEach(subPoint => {
        body += generatePointHtmlRecursive(subPoint);
    });

    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>${escapeXml(mainPoint.title)}</title>
  <link rel="stylesheet" type="text/css" href="../styles/style.css" />
</head>
<body>
  ${body}
</body>
</html>`;
};


export const generateEpub = async (speech: Speech | null): Promise<void> => {
    if (!speech || speech.mainPoints.length === 0) {
        alert("No speech content available to export.");
        return;
    }

    if (typeof JSZip === 'undefined') {
        alert("EPUB generation libraries are not loaded. Please check your internet connection and try again.");
        return;
    }

    try {
        const zip = new JSZip();
        const title = speech.title || "My Speech";
        const sanitizedTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const author = "Public Speaking Helper";
        const uuid = `urn:uuid:${Date.now()}`;

        // 1. mimetype file
        zip.file("mimetype", "application/epub+zip", { compression: "STORE" });

        // 2. META-INF/container.xml
        const containerXml = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;
        zip.file("META-INF/container.xml", containerXml);

        // 3. OEBPS/styles/style.css
        const styleCss = `body { font-family: sans-serif; line-height: 1.5; }
h1, h2, h3, h4, h5, h6 { line-height: 1.2; }`;
        zip.folder("OEBPS")?.folder("styles")?.file("style.css", styleCss);

        // 4. Content files and Manifest/Spine items
        const manifestItems: string[] = [];
        const spineItems: string[] = [];
        const tocNavPoints: string[] = [];
        
        speech.mainPoints.forEach((point, index) => {
            const chapterId = `chapter-${index + 1}`;
            const chapterHref = `content/${chapterId}.xhtml`;

            // Add chapter content
            const chapterHtml = generateChapterHtml(point);
            zip.folder("OEBPS")?.folder("content")?.file(`${chapterId}.xhtml`, chapterHtml);

            // Add to manifest
            manifestItems.push(`<item id="${chapterId}" href="${chapterHref}" media-type="application/xhtml+xml" />`);
            
            // Add to spine
            spineItems.push(`<itemref idref="${chapterId}" />`);

            // Add to TOC
            tocNavPoints.push(`<navPoint id="navpoint-${index + 1}" playOrder="${index + 1}">
  <navLabel><text>${escapeXml(point.title)}</text></navLabel>
  <content src="${chapterHref}"/>
</navPoint>`);
        });

        // 5. OEBPS/content.opf
        const contentOpf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="bookid" version="2.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
    <dc:title>${escapeXml(title)}</dc:title>
    <dc:creator opf:role="aut">${escapeXml(author)}</dc:creator>
    <dc:identifier id="bookid">${uuid}</dc:identifier>
    <dc:language>en</dc:language>
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml" />
    <item id="css" href="styles/style.css" media-type="text/css" />
    ${manifestItems.join('\n    ')}
  </manifest>
  <spine toc="ncx">
    ${spineItems.join('\n    ')}
  </spine>
</package>`;
        zip.folder("OEBPS")?.file("content.opf", contentOpf);
        
        // 6. OEBPS/toc.ncx
        const tocNcx = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE ncx PUBLIC "-//NISO//DTD ncx 2005-1//EN" "http://www.daisy.org/z3986/2005/ncx-2005-1.dtd">
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${uuid}" />
    <meta name="dtb:depth" content="1" />
    <meta name="dtb:totalPageCount" content="0" />
    <meta name="dtb:maxPageNumber" content="0" />
  </head>
  <docTitle>
    <text>${escapeXml(title)}</text>
  </docTitle>
  <navMap>
    ${tocNavPoints.join('\n    ')}
  </navMap>
</ncx>`;
        zip.folder("OEBPS")?.file("toc.ncx", tocNcx);

        // 7. Generate and download
        const blob = await zip.generateAsync({
            type: "blob",
            mimeType: "application/epub+zip",
        });

        saveAs(blob, `${sanitizedTitle}.epub`);

    } catch (e) {
        console.error("Error generating ePub:", e);
        alert("Could not generate ePub. An unexpected error occurred.");
    }
};