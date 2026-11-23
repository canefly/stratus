import sys
import os
import uuid
import json
import re
from docx import Document
from docx.text.run import Run

def process_time_raw(raw):
    if not raw:
        return "00:00:00", 0
    parts = raw.replace('-', '').replace('–', '').replace('—', '').replace('(', '').replace(')', '').strip().split(':')
    if len(parts) == 2:
        m, s = parts
        h = "00"
        f = "00"
    elif len(parts) == 3:
        h, m, s = parts
        f = "00"
    elif len(parts) == 4:
        h, m, s, f = parts
    else:
        return "00:00:00:00", 0
        
    h = h.zfill(2)
    m = m.zfill(2)
    s = s.zfill(2)
    f = f.zfill(2)
    
    total_seconds = int(h) * 3600 + int(m) * 60 + int(s)
    return f"{h}:{m}:{s}:{f}", total_seconds

def normalize_link(link):
    if not link:
        return link
        
    # YouTube specific normalization: extract 11-char video ID and format to clean youtu.be link
    youtube_patterns = [
        r'(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})',
        r'(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})',
        r'(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/v\/([a-zA-Z0-9_-]{11})',
        r'(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})',
        r'(?:https?:\/\/)?youtu\.be\/([a-zA-Z0-9_-]{11})'
    ]
    
    yt_id = None
    for pattern in youtube_patterns:
        match = re.search(pattern, link)
        if match:
            yt_id = match.group(1)
            break
            
    if yt_id:
        return f"https://www.youtube.com/watch?v={yt_id}"

    # Remove fragments like #t=123
    link = re.sub(r'#.*$', '', link)
    
    # Google Drive specific: remove /view, /edit, and any following query parameters
    if 'drive.google.com' in link:
        # Strip /view and everything after it (like /view?.123 or /view?usp=sharing)
        # This is the primary request from the user
        link = re.sub(r'/(?:view|edit|preview|copy|sharing).*$', '', link)
        
        # For /file/d/ID links, we can safely strip all query params for uniqueness
        if '/file/d/' in link:
            link = re.sub(r'\?.*$', '', link)
        
        # Handle the ?.xxxxxx pattern if it appears at the end of other GDrive link types
        link = re.sub(r'[?&]\.[\d]+$', '', link)

    # Remove common timestamp parameters for other links (YouTube, etc)
    link = re.sub(r'([?&])(?:t|time|start|timestamp|at)=\d+&?', r'\1', link)
    
    # Clean up trailing ? or &
    link = link.rstrip('?&')
    return link.strip()




def get_font_attr(run, paragraph, attr_name):
    if run.font:
        val = getattr(run.font, attr_name, None)
        if val is not None:
            return val
            
    current_style = paragraph.style
    while current_style:
        if current_style.font:
            val = getattr(current_style.font, attr_name, None)
            if val is not None:
                return val
        current_style = current_style.base_style
        
    return None

def parse_docx(file_path, image_output_dir=None):
    if not image_output_dir:
        image_output_dir = os.path.join(os.path.dirname(os.path.abspath(file_path)), os.path.splitext(os.path.basename(file_path))[0] + "_images")
    os.makedirs(image_output_dir, exist_ok=True)
    doc = Document(file_path)
    lines = []
    
    for i, p in enumerate(doc.paragraphs):
        text = p.text.strip()
        
        # Check if the paragraph has any images before skipping
        has_images = False
        if p._p.xml:
            for rel in doc.part.rels.values():
                if "image" in rel.reltype and (f'"{rel.rId}"' in p._p.xml or f"'{rel.rId}'" in p._p.xml):
                    has_images = True
                    break
                    
        if not text and not has_images:
            continue
            
        is_header = False
        header_level = None
        if p.style and p.style.name:
            style_name = p.style.name
            if style_name.startswith('Heading'):
                is_header = True
                match = re.search(r'\d+', style_name)
                if match:
                    header_level = int(match.group())
            elif 'Title' in style_name:
                is_header = True
                header_level = 1 if 'Subtitle' not in style_name else 2

        spans = []
        
        runs_and_links = []
        for child in p._p:
            if child.tag.endswith('}r'):
                runs_and_links.append((Run(child, p), None))
            elif child.tag.endswith('}hyperlink'):
                rId = child.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id')
                url = None
                if rId and rId in doc.part.rels:
                    url = doc.part.rels[rId].target_ref
                for sub_child in child:
                    if sub_child.tag.endswith('}r'):
                        runs_and_links.append((Run(sub_child, p), url))

        for run, link in runs_and_links:
            if not run.text:
                continue
                
            color_obj = get_font_attr(run, p, 'color')
            color = str(color_obj.rgb) if color_obj and hasattr(color_obj, 'rgb') and color_obj.rgb else None
            
            bold = get_font_attr(run, p, 'bold')
            if bold is None and run.bold:
                bold = run.bold
                
            italic = get_font_attr(run, p, 'italic')
            if italic is None and run.italic:
                italic = run.italic
                
            size_obj = get_font_attr(run, p, 'size')
            size = f"{size_obj.pt}pt" if size_obj and hasattr(size_obj, 'pt') and size_obj.pt is not None else None
                
            spans.append({
                "text": run.text, 
                "color": f"#{color}" if color else None,
                "bold": bool(bold),
                "italic": bool(italic),
                "size": size,
                "link": link
            })
            
        merged_spans = []
        for span in spans:
            if not merged_spans:
                merged_spans.append(span)
            else:
                last_span = merged_spans[-1]
                if (last_span["color"] == span["color"] and 
                    last_span["bold"] == span["bold"] and 
                    last_span["italic"] == span["italic"] and 
                    last_span["size"] == span["size"] and 
                    last_span["link"] == span["link"]):
                    last_span["text"] += span["text"]
                else:
                    merged_spans.append(span)
        spans = merged_spans

        # Heuristic auto-detection for document headings/tabs if not already marked by Word styles
        if not is_header and text and not bool(re.search(r'@?editor', text, re.IGNORECASE)):
            clean_text = text.strip()
            # Must be relatively short section title line and not a full sentence ending with punctuation
            if len(clean_text) <= 80 and not clean_text.endswith(('.', '?', '!', ';')):
                # Check for explicit section keywords like "Lvl 1", "Lvl 2", "Chapter", "Section", "Outro", "Intro", "Floorplan", etc.
                section_kw_match = re.match(r'^(lvl|level|chapter|section|part|tab|scene|act|outro|intro)\s*(\d*)', clean_text, re.IGNORECASE)
                
                # Check if all non-empty spans are bold
                all_bold = len(spans) > 0 and all(s.get("bold") for s in spans if s.get("text", "").strip())
                
                # Check for font size >= 13pt
                large_font = False
                for s in spans:
                    sz = s.get("size")
                    if sz and sz.endswith("pt"):
                        try:
                            if float(sz.replace("pt", "")) >= 13.0:
                                large_font = True
                                break
                        except ValueError:
                            pass

                if section_kw_match or all_bold or large_font:
                    is_header = True
                    # Hierarchy detection: "Lvl 2", "Level 2", etc -> level 2
                    if re.search(r'\b(lvl\s*2|level\s*2|sub[- ]?section)\b', clean_text, re.IGNORECASE):
                        header_level = 2
                    elif re.search(r'\b(lvl\s*3|level\s*3)\b', clean_text, re.IGNORECASE):
                        header_level = 3
                    elif section_kw_match:
                        num = section_kw_match.group(2)
                        header_level = int(num) if num and int(num) in [1, 2, 3, 4] else 1
                    elif large_font:
                        header_level = 1
                    else:
                        header_level = 1 if len(clean_text) < 40 else 2
            

        extracted_images = []
        hidden_links = []
        if p._p.xml:
            for rel in doc.part.rels.values():
                # Check for exact quotes around the relationship ID to prevent substring match bugs
                if "hyperlink" in rel.reltype and (f'"{rel.rId}"' in p._p.xml or f"'{rel.rId}'" in p._p.xml):
                    hidden_links.append(rel.target_ref)
                elif "image" in rel.reltype and (f'"{rel.rId}"' in p._p.xml or f"'{rel.rId}'" in p._p.xml):
                    try:
                        img_part = rel.target_part
                        img_bytes = img_part.blob
                        img_ext = img_part.content_type.split('/')[-1] if img_part.content_type else 'png'
                        if img_ext == 'jpeg':
                            img_ext = 'jpg'
                        
                        img_filename = f"{uuid.uuid4().hex[:8]}.{img_ext}"
                        img_path = os.path.join(image_output_dir, img_filename)
                        with open(img_path, 'wb') as f_img:
                            f_img.write(img_bytes)
                        extracted_images.append(os.path.abspath(img_path))
                    except Exception as e:
                        pass

                    
        lines.append({
            "text": text,
            "spans": spans,
            "hiddenLinks": hidden_links,
            "extractedImages": extracted_images,
            "origIndex": i,
            "isEditorLine": bool(re.search(r'@?editor', text, re.IGNORECASE)),
            "isHeader": is_header,
            "headerLevel": header_level
        })
        
    items = []
    linksSet = set()
    notes = []
    warnings = []
    processedLineIndices = set()

    triggerRegex = re.compile(r'@?editor\s*[:;]?\s*.*(play|pay|lay|pla|ply|insert|inset|insrt|inst|show|use|using|clip|roll|cut|add)', re.IGNORECASE)
    globalTimeRegex = re.compile(r'(?:\(?((?:\d{1,2}:)?\d{1,2}:\d{2}(?::\d{2})?)\)?\s*(?:[-–—]|to)\s*\(?((?:\d{1,2}:)?\d{1,2}:\d{2}(?::\d{2})?)\)?)|(?:\(?((?:\d{1,2}:)?\d{1,2}:\d{2}(?::\d{2})?)\)?)', re.IGNORECASE)

    def process_match(match, i, linesArr, meta, syncId):
        g1, g2, g3 = match
        
        startStr = None
        endStr = None
        startSec = 0
        endSec = 0
        isSingle = False

        if g1:
            startStr, startSec = process_time_raw(g1)
            endStr, endSec = process_time_raw(g2)
        elif g3:
            startStr, startSec = process_time_raw(g3)
            isSingle = True

        if not startStr:
            return

        duration = 0
        if not isSingle and endStr:
            duration = endSec - startSec
            if duration < 0:
                duration = 0

        # Find the index of the line in linesArr corresponding to syncId (timestamp line)
        t_idx = None
        for idx, line in enumerate(linesArr):
            if line["origIndex"] == syncId:
                t_idx = idx
                break
                
        pivot_idx = t_idx if t_idx is not None else i
        
        # Search offsets prioritizing the timestamp line itself, then closest neighbors
        foundLink = None
        offsets = [0, -1, 1, 2, 3, 4]
        for offset in offsets:
            k = pivot_idx + offset
            if 0 <= k < len(linesArr):
                checkLine = linesArr[k]
                
                # 1. Check spans for inline hyperlink
                if "spans" in checkLine:
                    for span in checkLine["spans"]:
                        if span.get("link"):
                            foundLink = span["link"]
                            break
                            
                # 2. Check plain text for URL
                if not foundLink and 'http' in checkLine["text"]:
                    urlMatch = re.search(r'(https?:\/\/[^\s]+)', checkLine["text"])
                    if urlMatch:
                        foundLink = urlMatch.group(1)
                        
                # 3. Check hidden links
                if not foundLink and checkLine.get("hiddenLinks"):
                    foundLink = checkLine["hiddenLinks"][0]
                    
                if foundLink:
                    break

        if foundLink:
            linksSet.add(normalize_link(foundLink))

        items.append({
            "id": len(items),
            "meta": meta,
            "start": startStr,
            "end": None if isSingle else endStr,
            "duration": duration,
            "isSingle": isSingle,
            "link": foundLink or '#',
            "included": True,
            "checked": False,
            "syncId": syncId
        })


    for i, lineObj in enumerate(lines):
        textLine = lineObj["text"]
        
        if lineObj["isEditorLine"]:
            if triggerRegex.search(textLine):
                foundTimestamp = False
                foundMeta = "Clip"
                
                for m in range(max(0, i - 3), min(i + 3, len(lines))):
                    metaCheck = lines[m]["text"]
                    fullMatch = re.search(r'S(\d+)\s*E(\d+)|Season\s*(\d+)|Episode\s*(\d+)', metaCheck, re.IGNORECASE)
                    if fullMatch:
                        s = fullMatch.group(1) or fullMatch.group(3)
                        e = fullMatch.group(2) or fullMatch.group(4)
                        if not s or not e:
                           sM = re.search(r'S(\d+)|Season\s*(\d+)', metaCheck, re.IGNORECASE)
                           eM = re.search(r'E(\d+)|Episode\s*(\d+)', metaCheck, re.IGNORECASE)
                           s = sM.group(1) if sM else None
                           e = eM.group(1) if eM else None
                        
                        if s and e:
                            foundMeta = f"S{str(s).zfill(2)}E{str(e).zfill(2)}"
                            break
                            
                searchLimit = min(i + 6, len(lines))
                for j in range(i, searchLimit):
                    subLineObj = lines[j]
                    if j > i and triggerRegex.search(subLineObj["text"]):
                        break
                        
                    matches = globalTimeRegex.findall(subLineObj["text"])
                    if matches:
                        foundTimestamp = True
                        for match in matches:
                            processedLineIndices.add(subLineObj["origIndex"])
                            process_match(match, i, lines, foundMeta, subLineObj["origIndex"])
                            
                if not foundTimestamp:
                    warnings.append("Found @editor tag but no timestamp. This has been moved to Editor's Notes.")
                    notes.append({"id": lineObj["origIndex"], "text": textLine})
                    
            else:
                context = (textLine[:60] + '...') if len(textLine) > 60 else textLine
                warnings.append(f"Ignored Unknown Command: \"{context}\". This has been moved to Editor's Notes.")
                notes.append({"id": lineObj["origIndex"], "text": textLine})
                
        if lineObj["origIndex"] not in processedLineIndices:
            matches = globalTimeRegex.findall(textLine)
            if matches:
                hasLinkNearby = False
                for k in range(max(0, i - 1), min(i + 2, len(lines))):
                    if 'http' in lines[k]["text"] or lines[k]["hiddenLinks"]:
                        hasLinkNearby = True
                        break
                        
                if hasLinkNearby:
                    for match in matches:
                        processedLineIndices.add(lineObj["origIndex"])
                        fallbackMeta = "Clip"
                        for m in range(max(0, i - 2), min(i + 2, len(lines))):
                            metaCheck = lines[m]["text"]
                            metaMatch = re.search(r'S(\d+)\s*E(\d+)', metaCheck, re.IGNORECASE)
                            if metaMatch:
                                fallbackMeta = f"S{metaMatch.group(1).zfill(2)}E{metaMatch.group(2).zfill(2)}"
                                break
                        process_match(match, i, lines, fallbackMeta, lineObj["origIndex"])
                        
        if lineObj["hiddenLinks"]:
            for link in lineObj["hiddenLinks"]:
                linksSet.add(normalize_link(link))
                
    blocks = []
    for line in lines:
        block = {
            "id": line["origIndex"],
            "text": line["text"],
            "spans": line["spans"],
            "images": line.get("extractedImages", []),
            "isEditorLine": line["isEditorLine"],
            "isHeader": line["isHeader"],
            "headerLevel": line["headerLevel"]
        }
        blocks.append(block)
        
    result = {
        "items": items,
        "links": list(linksSet),
        "notes": notes,
        "report": {
            "count": len(items),
            "warnings": warnings
        },
        "blocks": blocks
    }
    
    return result

if __name__ == "__main__":
    # Workaround for windows stdout encoding issues for JSON dumps that might have emojis/weird chars
    sys.stdout.reconfigure(encoding='utf-8')
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No file path provided"}))
        sys.exit(1)
        
    file_path = sys.argv[1]
    image_dir = sys.argv[2] if len(sys.argv) > 2 else None
    
    try:
        output = parse_docx(file_path, image_dir)
        print(json.dumps(output))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
