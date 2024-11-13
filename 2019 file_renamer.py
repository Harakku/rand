import os
import re


# https://stackoverflow.com/a/4836734
def natural_sort(l): 
    convert = lambda text: int(text) if text.isdigit() else text.lower() 
    alphanum_key = lambda key: [ convert(c) for c in re.split('([0-9]+)', key) ] 
    return sorted(l, key = alphanum_key)

path = os.getcwd()

i = 1
for root, dirs, filenames in os.walk(path):
    filenames = natural_sort(filenames)
    for filename in filenames:
        ext = os.path.splitext(filename)[1]
        if ext not in [".log", ".cue"]:
            continue
        
        max_length = 90
        album_name_section = re.match(
            r"(.*) \(.*\) \[.*\] [a-z0-9]{8}",
            root.split("/")[-1]
        ).group(1)[:max_length]
        
        # with this the first log of a multi-disc album ends with disc1
        if len([f for f in filenames if re.match(".*" + ext, f)]) > 1:
            default_part_str = ", disc1"
        else:
            default_part_str = ""
        
        i = 0
        while True:
            i += 1
            part_str = default_part_str if i == 1 else ", disc" + str(i)
            
            if (
                os.path.exists(os.path.join(root, album_name_section + part_str + ext))
                and os.path.join(root, filename) != os.path.join(root, album_name_section + part_str + ext)
            ):
                continue
            
            print(os.path.join(root, filename) + "\n->\n" + os.path.join(root, album_name_section + part_str + ext)
                  + "\n\n")
            
            os.rename(os.path.join(root, filename), os.path.join(root, album_name_section + part_str + ext))
            break
