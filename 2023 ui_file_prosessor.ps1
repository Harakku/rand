if ($args.Count -eq 3) {
    $dubbidir = $args[0]
    $subidir = $args[1]
    $outputdir = $args[2]
}
else {
    Add-Type -AssemblyName System.Windows.Forms
    $dubbidirdialog = New-Object System.Windows.Forms.FolderBrowserDialog
    $dubbidirdialog.Description = "Valitse dubbi-kansio"
    $dubbidirdialog.ShowDialog()
    $dubbidir = $dubbidirdialog.SelectedPath
    $subidirdialog = New-Object System.Windows.Forms.FolderBrowserDialog
    $subidirdialog.Description = "Valitse subi-kansio"
    $subidirdialog.ShowDialog()
    $subidir = $subidirdialog.SelectedPath
    $outputdirdialog = New-Object System.Windows.Forms.FolderBrowserDialog
    $outputdirdialog.Description = "Valitse output-kansio"
    $outputdirdialog.ShowDialog()
    $outputdir = $outputdirdialog.SelectedPath
}

if (!($dubbidir) -or !($subidir) -or !($outputdir)) {
    Write-Host "Vaadittavia kansioita ei ole valittu. Sulje painamalla nappainta..."
    Read-Host
    exit
}

$dubbifiles = [System.Collections.ArrayList]@(Get-ChildItem -Path $dubbidir -Recurse -File)
$subifiles = [System.Collections.ArrayList]@(Get-ChildItem -Path $subidir -Recurse -File)
$paritondubbifiles = [System.Collections.ArrayList]@(Get-ChildItem -Path $dubbidir -Recurse -File)

Write-Host "Dubbi:" $dubbidir
Write-Host "Subi:" $subidir
Write-Host "Output:" $outputdir
Write-Host ""

foreach ($dubbifile in $dubbifiles) {
    $subifile = $subifiles | Where-Object {$_.BaseName -eq $dubbifile.BaseName}

    if ($subifile) {
        $paritondubbifile = $paritondubbifiles | Where-Object {$_.BaseName -eq $dubbifile.BaseName}
        $paritondubbifiles.Remove($paritondubbifile)
        $subifiles.Remove($subifile)

        $parentdir = Split-Path (Split-Path -Path $dubbifile.FullName -Parent) -Leaf
        if ($parentdir -ne (Split-Path $dubbidir -Leaf)) {
            if (!(test-path (Join-Path -Path $outputdir -ChildPath $parentdir))) {
                New-Item -ItemType Directory -Path (Join-Path -Path $outputdir -ChildPath $parentdir) | out-null
            }
            $outputfile = Join-Path -Path $outputdir -ChildPath ($parentdir + "\" + $dubbifile.Name)
        }
        else {
            $outputfile = Join-Path -Path $outputdir -ChildPath $dubbifile.Name
        }

        if (test-path $outputfile -pathtype leaf) {
            Write-Host "Skipping:" $outputfile
            continue
        }
        Write-Host "Kasitellaan:" $outputfile
        ffmpeg.exe -hide_banner -loglevel error -i $dubbifile.FullName -i $subifile.FullName -map 0:a -map 1:v -c copy $outputfile
    }
}

if ($subifiles.Count -ne 0 -or $paritondubbifiles.Count -ne 0) {
    foreach ($file in $paritondubbifiles) {
        Write-Host "Pariton:" $file.fullname
    }
    foreach ($file in $subifiles) {
        Write-Host "Pariton:" $file.fullname
    }
}
else {
    Write-Host "Ei parittomia tiedostoja. Hyva hyva."
}

Write-Host "Done. Sulje painamalla nappainta..."
Read-Host
