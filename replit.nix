{pkgs}: {
  deps = [
    pkgs.glibcLocales
    pkgs.unzip
    pkgs.jq
    pkgs.lsof
    pkgs.procps
    pkgs.postgresql
  ];
}
