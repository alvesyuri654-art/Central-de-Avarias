Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
psScript = scriptDir & "\iniciar_servidor.ps1"
portFile = scriptDir & "\active_port.txt"

Function GetActivePort()
    On Error Resume Next
    If fso.FileExists(portFile) Then
        Set file = fso.OpenTextFile(portFile, 1)
        portStr = Trim(file.ReadAll())
        file.Close
        If IsNumeric(portStr) Then
            GetActivePort = Trim(portStr)
            Exit Function
        End If
    End If
    GetActivePort = "5173"
    On Error Goto 0
End Function

Function IsServerRunning(port)
    On Error Resume Next
    Set http = CreateObject("MSXML2.ServerXMLHTTP.6.0")
    http.setTimeouts 500, 500, 1000, 1000
    http.open "GET", "http://127.0.0.1:" & port & "/api/health", False
    http.send
    If Err.Number = 0 And http.status = 200 Then
        IsServerRunning = True
    Else
        IsServerRunning = False
    End If
    On Error Goto 0
End Function

targetPort = GetActivePort()

If Not IsServerRunning(targetPort) Then
    ' Inicia o servidor PowerShell em background invisível
    cmd = "powershell.exe -ExecutionPolicy Bypass -NoProfile -WindowStyle Hidden -File """ & psScript & """"
    WshShell.Run cmd, 0, False

    ' Aguarda até 3 segundos para inicialização
    For i = 1 To 15
        WScript.Sleep 200
        targetPort = GetActivePort()
        If IsServerRunning(targetPort) Then Exit For
    Next
End If

' Abre a aplicação no navegador padrão
targetUrl = "http://localhost:" & targetPort & "/"
WshShell.Run "rundll32.exe url.dll,FileProtocolHandler " & targetUrl
