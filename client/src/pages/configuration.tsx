import { ConfigurationPanel } from "@/components/configuration/ConfigurationPanel";
import { t } from "@/lib/i18n";
import { useIsMobile } from "@/hooks/use-mobile";
import { ErrorTestingPanel } from "@/components/ErrorTestingUtils";
import AbortTestComponent from "@/components/AbortTestComponent";
import { RuntimeErrorTest } from "@/runtime-error-test";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ClipboardCheck, Bug, ZapIcon, AlertTriangleIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function ConfigurationPage() {
  const isMobile = useIsMobile();
  const [showErrorTesting, setShowErrorTesting] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("directTest");
  const [triggeredTest, setTriggeredTest] = useState(false);

  // Only show the error testing tools in development
  const isDevelopment = import.meta.env.DEV;

  return (
    <div className="space-y-6">
      <div className={`flex items-center ${isMobile ? 'justify-center' : 'justify-between'} mb-4`}>
        <h1 className="text-2xl font-bold tracking-tight">
          {t("common.configuration")}
        </h1>
        
        {isDevelopment && (
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setShowErrorTesting(!showErrorTesting);
                if (!showErrorTesting) {
                  setActiveTab("directTest");
                }
              }}
              className="flex items-center gap-1"
            >
              {showErrorTesting ? <ClipboardCheck size={14} /> : <Bug size={14} />}
              {showErrorTesting ? 'Hide Debug Tools' : 'Show Debug Tools'}
            </Button>
          </div>
        )}
      </div>
      
      {/* Development-only error testing panel */}
      {isDevelopment && showErrorTesting && (
        <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="directTest">Abort Error Test</TabsTrigger>
            <TabsTrigger value="abortTest">Test Controls</TabsTrigger>
            <TabsTrigger value="general">General Tests</TabsTrigger>
          </TabsList>
          
          <TabsContent value="directTest" className="mt-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangleIcon className="h-5 w-5 text-yellow-500" />
                  Direct Runtime Error Plugin Test
                </CardTitle>
                <CardDescription>
                  Directly test the fix for "[plugin:runtime-error-plugin] signal is aborted without reason" error
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert variant="destructive">
                  <AlertTriangleIcon className="h-4 w-4" />
                  <AlertTitle>Important</AlertTitle>
                  <AlertDescription>
                    This test directly creates an AbortError condition. If our fix works, you should NOT see the error
                    "[plugin:runtime-error-plugin] signal is aborted without reason" in your console or as an overlay.
                  </AlertDescription>
                </Alert>
                
                <div className="flex justify-center p-4">
                  <Button 
                    onClick={() => setTriggeredTest(true)} 
                    variant="destructive"
                    disabled={triggeredTest}
                  >
                    {triggeredTest ? "Test Running" : "Run Direct Runtime Error Test"}
                  </Button>
                </div>
                
                {triggeredTest && <RuntimeErrorTest />}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="abortTest" className="mt-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ZapIcon className="h-5 w-5" />
                  Abort Error Tests
                </CardTitle>
                <CardDescription>
                  Test our fixes for Vite's "[plugin:runtime-error-plugin] signal is aborted without reason" error
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AbortTestComponent />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="general" className="mt-2">
            <Card>
              <CardHeader>
                <CardTitle>General Error Testing</CardTitle>
                <CardDescription>
                  Test various error scenarios and handling in the application
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ErrorTestingPanel />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
      
      {/* Main configuration panel */}
      <ConfigurationPanel />
    </div>
  );
}
