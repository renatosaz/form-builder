import React, { useRef, useState, useEffect } from 'react'
import { Highlight, themes } from 'prism-react-renderer'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'

import { renderFormField } from '@/screens/render-form-field'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Form, FormField, FormItem, FormControl } from '@/components/ui/form'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import If from '@/components/ui/if'
import { FormFieldType } from '@/types'

import { Files, Save } from 'lucide-react'
import {
  generateZodSchema,
  generateFormCode,
  generateDefaultValues,
} from '@/screens/generate-code-parts'
import { formatJSXCode } from '@/lib/utils'

export type FormFieldOrGroup = FormFieldType | FormFieldType[]

export type FormPreviewProps = {
  formFields: FormFieldOrGroup[]
}

const renderFormFields = (fields: FormFieldOrGroup[], form: any) => {
  return fields.map((fieldOrGroup, index) => {
    if (Array.isArray(fieldOrGroup)) {
      // Calculate column span based on number of fields in the group
      const getColSpan = (totalFields: number) => {
        switch (totalFields) {
          case 2:
            return 6 // Two columns
          case 3:
            return 4 // Three columns
          default:
            return 12 // Single column or fallback
        }
      }

      return (
        <div key={index} className="grid grid-cols-12 gap-4">
          {fieldOrGroup.map((field, subIndex) => (
            <FormField
              key={field.name}
              control={form.control}
              name={field.name}
              render={({ field: formField }) => (
                <FormItem
                  className={`col-span-${getColSpan(fieldOrGroup.length)}`}
                >
                  <FormControl>
                    {React.cloneElement(
                      renderFormField(field, form) as React.ReactElement,
                      {
                        ...formField,
                      },
                    )}
                  </FormControl>
                </FormItem>
              )}
            />
          ))}
        </div>
      )
    } else {
      return (
        <FormField
          key={index}
          control={form.control}
          name={fieldOrGroup.name}
          render={({ field: formField }) => (
            <FormItem className="col-span-12">
              <FormControl>
                {React.cloneElement(
                  renderFormField(fieldOrGroup, form) as React.ReactElement,
                  {
                    ...formField,
                  },
                )}
              </FormControl>
            </FormItem>
          )}
        />
      )
    }
  })
}

export const FormPreview: React.FC<FormPreviewProps> = ({ formFields }) => {
  const [jsonContent, setJsonContent] = useState<string>(
    JSON.stringify(formFields, null, 2)
  );
  const [currentFormFields, setCurrentFormFields] = useState<FormFieldOrGroup[]>(formFields);
  const [jsonError, setJsonError] = useState<string | null>(null);

  useEffect(() => {
    // Update JSON content when formFields prop changes
    setJsonContent(JSON.stringify(formFields, null, 2));
    setCurrentFormFields(formFields);
  }, [formFields]);

  const formSchema = generateZodSchema(currentFormFields)
  const defaultVals = generateDefaultValues(currentFormFields)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultVals,
  })

  function onSubmit(data: any) {
    try {
      toast(
        <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
          <code className="text-white">{JSON.stringify(data, null, 2)}</code>
        </pre>,
      )
    } catch (error) {
      console.error('Form submission error', error)
      toast.error('Failed to submit the form. Please try again.')
    }
  }

  const handleJsonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setJsonContent(e.target.value);
    setJsonError(null);
  };

  const applyJsonChanges = () => {
    try {
      const parsedJson = JSON.parse(jsonContent);
      setCurrentFormFields(parsedJson);
      toast.success('Form updated successfully!');
    } catch (error) {
      console.error('JSON parsing error', error);
      setJsonError('Invalid JSON format. Please check your syntax.');
      toast.error('Invalid JSON format. Please check your syntax.');
    }
  };

  const generatedCode = generateFormCode(currentFormFields)
  const formattedCode = formatJSXCode(generatedCode)

  return (
    <div className="w-full h-full col-span-1 rounded-xl flex justify-center">
      <Tabs defaultValue="preview" className="w-full">
        <TabsList className="flex justify-center w-fit mx-auto">
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="json">JSON</TabsTrigger>
          <TabsTrigger value="code">Code</TabsTrigger>
        </TabsList>
        <TabsContent
          value="preview"
          className="space-y-4 h-full md:max-h-[70vh] overflow-auto"
        >
          <If
            condition={currentFormFields.length > 0}
            render={() => (
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4 py-5 max-w-lg mx-auto"
                >
                  {renderFormFields(currentFormFields, form)}
                  <Button type="submit">Submit</Button>
                </form>
              </Form>
            )}
            otherwise={() => (
              <div className="h-[50vh] flex justify-center items-center">
                <p>No form element selected yet.</p>
              </div>
            )}
          />
        </TabsContent>
        <TabsContent value="json" className="p-4">
          <div className="flex flex-col gap-4">
            <div className="flex justify-end">
              <Button 
                onClick={applyJsonChanges} 
                className="flex items-center gap-2"
                variant="outline"
              >
                <Save className="h-4 w-4" />
                Apply Changes
              </Button>
            </div>
            {jsonError && (
              <div className="p-2 text-sm text-red-500 bg-red-50 rounded-md">
                {jsonError}
              </div>
            )}
            <textarea
              value={jsonContent}
              onChange={handleJsonChange}
              className="w-full h-[60vh] p-4 font-mono text-sm rounded-md border border-gray-300"
              spellCheck="false"
            />
          </div>
        </TabsContent>
        <TabsContent value="code">
          <If
            condition={currentFormFields.length > 0}
            render={() => (
              <div className="relative">
                <Button
                  className="absolute right-2 top-2"
                  variant="secondary"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(formattedCode)
                    toast.success('Code copied to clipboard!')
                  }}
                >
                  <Files />
                </Button>
                <Highlight
                  code={formattedCode}
                  language="tsx"
                  theme={themes.oneDark}
                >
                  {({
                    className,
                    style,
                    tokens,
                    getLineProps,
                    getTokenProps,
                  }: any) => (
                    <pre
                      className={`${className} p-4 text-sm bg-gray-100 rounded-lg 
                      h-full md:max-h-[70vh] overflow-auto`}
                      style={style}
                    >
                      {tokens.map((line: any, i: number) => (
                        <div {...getLineProps({ line, key: i })}>
                          {line.map((token: any, key: any) => (
                            <span {...getTokenProps({ token, key })} />
                          ))}
                        </div>
                      ))}
                    </pre>
                  )}
                </Highlight>
              </div>
            )}
            otherwise={() => (
              <div className="h-[50vh] flex justify-center items-center">
                <p>No form element selected yet.</p>
              </div>
            )}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
