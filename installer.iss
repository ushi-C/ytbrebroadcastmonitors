#define MyAppName "YTBmonitor"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "YTBmonitor"
#define MyAppExeName "YTBmonitor.exe"
#ifndef MyAppDefaultDir
  #define MyAppDefaultDir "{autopf}\YTBmonitor"
#endif

[Setup]
AppId={{A1E9F341-9B59-4A2C-9A84-8B82582D4A60}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={#MyAppDefaultDir}
DefaultGroupName=YTBmonitor
DisableProgramGroupPage=yes
DisableDirPage=no
UsePreviousAppDir=no
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog
OutputDir=dist
OutputBaseFilename=YTBmonitor-Setup
Compression=lzma
SolidCompression=yes
WizardStyle=modern
ArchitecturesInstallIn64BitMode=x64compatible

[Languages]
Name: "chinesesimp"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "创建桌面快捷方式"; GroupDescription: "附加任务:";

[Files]
Source: "dist\YTBmonitor.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "channels.csv"; DestDir: "{app}"; Flags: onlyifdoesntexist skipifsourcedoesntexist

[Icons]
Name: "{autoprograms}\YTBmonitor"; Filename: "{app}\{#MyAppExeName}"
Name: "{autodesktop}\YTBmonitor"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "启动 YTBmonitor"; Flags: nowait postinstall skipifsilent
